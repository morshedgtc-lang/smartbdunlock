import { prisma } from '@/lib/prisma'
import { encryptApiKey, decryptApiKey } from '@/lib/crypto'
import {
  WEBHOOK_EVENTS,
  WEBHOOK_MAX_ATTEMPTS,
  WEBHOOK_TIMEOUT_MS,
  signWebhookPayload,
  backoffDelayMs,
  statusToWebhookEvent,
  isWebhook,
} from '@/lib/webhook-utils'
import type { WebhookEvent } from '@/lib/webhook-utils'

export {
  WEBHOOK_EVENTS,
  WEBHOOK_MAX_ATTEMPTS,
  signWebhookPayload,
  backoffDelayMs,
  statusToWebhookEvent,
  isWebhook,
}

function parseEvents(eventsJson: string | null | undefined): Set<string> {
  try {
    if (!eventsJson) return new Set()
    const parsed = JSON.parse(eventsJson)
    if (Array.isArray(parsed)) return new Set(parsed.map(String))
  } catch {
    /* ignore malformed */
  }
  return new Set()
}

export async function getWebhookForUser(userId: string) {
  return prisma.webhook.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  })
}

export function getWebhookSecret(webhook: { secretEncrypted: string | null }): string {
  if (!webhook.secretEncrypted) return ''
  try {
    return decryptApiKey(webhook.secretEncrypted)
  } catch {
    return ''
  }
}

export function encodeWebhookSecret(secret: string): string {
  return encryptApiKey(secret)
}

export async function buildOrderPayload(orderId: string, event: string, deliveryId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      service: { select: { id: true, name: true, type: true } },
      customValues: {
        include: {
          customField: { select: { label: true, fieldType: true, visibleToClient: true } },
        },
      },
    },
  })
  if (!order) return null

  const publicCustomValues = order.customValues
    .filter((cv) => cv.customField?.visibleToClient !== false)
    .map((cv) => ({
      label: cv.customField?.label,
      fieldType: cv.customField?.fieldType,
      value: cv.value,
    }))

  return {
    event,
    deliveryId,
    timestamp: new Date().toISOString(),
    data: {
      id: order.externalId || order.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      externalId: order.externalId,
      status: order.status,
      service: {
        id: order.service?.id,
        name: order.service?.name,
        type: order.service?.type,
      },
      imei: order.imei,
      deviceInfo: order.deviceInfo,
      notes: order.notes,
      result: order.result,
      customValues: publicCustomValues,
      sellingPrice: order.sellingPrice,
      completedAt: order.completedAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    },
  }
}

export async function enqueueWebhookEvent(params: {
  userId: string
  event: WebhookEvent | string
  orderId?: string
  payload?: unknown
}) {
  try {
    const webhook = await getWebhookForUser(params.userId)
    if (!webhook || webhook.status !== 'active') return

    const subscribed = parseEvents(webhook.events)
    if (!subscribed.has(params.event)) return

    const deliveryId = crypto.randomUUID()

    const payload = params.payload
      ? params.payload
      : params.orderId
        ? await buildOrderPayload(params.orderId, params.event, deliveryId)
        : { event: params.event, deliveryId, timestamp: new Date().toISOString(), data: null }

    if (!payload) return

    const rawBody = JSON.stringify(payload)

    const delivery = await prisma.webhookDelivery.create({
      data: {
        id: deliveryId,
        webhookId: webhook.id,
        userId: params.userId,
        event: params.event,
        orderId: params.orderId || null,
        payload: rawBody,
        status: 'pending',
        attempts: 0,
        maxAttempts: WEBHOOK_MAX_ATTEMPTS,
      },
    })

    void attemptDelivery(delivery.id)
  } catch (err) {
    console.error('Webhook enqueue failed:', err)
  }
}

export async function attemptDelivery(deliveryId: string) {
  try {
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true },
    })
    if (!delivery || delivery.status === 'success') return

    const webhook = delivery.webhook
    if (!webhook || webhook.status !== 'active') {
      if (!webhook) {
        await prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: { status: 'failed', error: 'Webhook no longer exists' },
        })
      }
      return
    }

    const secret = getWebhookSecret(webhook)
    const rawBody = delivery.payload || '{}'
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = signWebhookPayload(secret, timestamp, rawBody)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS)

    let response: Response | null = null
    let error: string | null = null
    try {
      response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SmartBDUnlock-Webhook/1.0',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': String(timestamp),
          'X-Webhook-Event': delivery.event,
          'X-Webhook-Delivery': delivery.id,
          'X-Request-ID': delivery.id,
        },
        body: rawBody,
        signal: controller.signal,
      })
    } catch (err) {
      error = err instanceof Error ? err.message : 'Network error'
    } finally {
      clearTimeout(timer)
    }

    const nextAttempts = delivery.attempts + 1
    const success = response !== null && response.status >= 200 && response.status < 300

    if (success) {
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'success',
          attempts: nextAttempts,
          responseCode: response!.status,
          error: null,
          lastAttemptAt: new Date(),
          nextAttemptAt: null,
          updatedAt: new Date(),
        },
      })
      return
    }

    const isExhausted = nextAttempts >= delivery.maxAttempts
    const responseCode = response ? response.status : null
    const errText = error || (response ? `HTTP ${response.status}` : 'No response')

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: isExhausted ? 'failed' : 'pending',
        attempts: nextAttempts,
        responseCode,
        error: isExhausted ? errText : null,
        lastAttemptAt: new Date(),
        nextAttemptAt: isExhausted ? null : new Date(Date.now() + backoffDelayMs(nextAttempts)),
        updatedAt: new Date(),
      },
    })
  } catch (err) {
    console.error(`Webhook delivery ${deliveryId} failed:`, err)
  }
}

export async function retryDueDeliveries(limit = 50) {
  const due = await prisma.webhookDelivery.findMany({
    where: {
      status: 'pending',
      nextAttemptAt: { lte: new Date() },
    },
    orderBy: { nextAttemptAt: 'asc' },
    take: limit,
  })

  for (const delivery of due) {
    await attemptDelivery(delivery.id)
  }

  return due.length
}

export async function sendWebhookTest(userId: string) {
  const webhook = await getWebhookForUser(userId)
  if (!webhook || webhook.status !== 'active') {
    return { ok: false, code: 'Webhook not configured' }
  }

  const deliveryId = crypto.randomUUID()
  const event = 'test.ping'
  const payload = {
    event,
    deliveryId,
    timestamp: new Date().toISOString(),
    data: {
      test: true,
      message: 'This is a test webhook from SmartBDUnlock API.',
      generatedAt: new Date().toISOString(),
    },
  }

  const delivery = await prisma.webhookDelivery.create({
    data: {
      id: deliveryId,
      webhookId: webhook.id,
      userId,
      event,
      orderId: null,
      payload: JSON.stringify(payload),
      status: 'pending',
      attempts: 0,
      maxAttempts: 1,
    },
  })

  await attemptDelivery(delivery.id)

  const result = await prisma.webhookDelivery.findUnique({ where: { id: delivery.id } })
  return {
    ok: result?.status === 'success',
    delivery: {
      id: delivery.id,
      event,
      status: result?.status,
      attempts: result?.attempts,
      responseCode: result?.responseCode,
      error: result?.error,
    },
  }
}