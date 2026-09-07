import { prisma } from '@/lib/prisma'
import { createOrderNotification, createWalletNotification } from '@/lib/notifications'
import { createSupplierJob, submitToSupplier } from '@/lib/suppliers'
import { enqueueWebhookEvent } from '@/lib/webhooks'
import { resolveEffectivePrice } from '@/lib/reseller-pricing'

export interface ApiCreateOrderInput {
  userId: string
  serviceId: string
  externalId?: string
  imei?: string
  deviceInfo?: string
  notes?: string
  customFieldValues?: Record<string, unknown>
  source?: string
}

export type ApiOrderResult =
  | {
      ok: true
      existing?: boolean
      order: unknown
      charged: number
      newBalance: number
    }
  | { ok: false; code: string; message: string; status: number }

async function resolveServiceForUser(userId: string, serviceId: string) {
  const service = await prisma.service.findUnique({ where: { id: serviceId } })
  if (!service) return null

  const overrides = await prisma.resellerService.findMany({ where: { userId } })
  const resolution = resolveEffectivePrice(service, overrides)
  if (!resolution.ok) return null

  return { service, price: resolution.price }
}

export async function createApiOrder(
  input: ApiCreateOrderInput,
): Promise<ApiOrderResult> {
  const { userId, serviceId, externalId, imei, deviceInfo, notes, customFieldValues } = input
  const source = input.source || 'api'

  const resolved = await resolveServiceForUser(userId, serviceId)
  if (!resolved) {
    return {
      ok: false,
      code: 'SERVICE_NOT_AVAILABLE',
      message: 'Service is not available for this account',
      status: 403,
    }
  }
  const { service, price } = resolved

  if (externalId) {
    const existing = await prisma.order.findFirst({
      where: { userId, externalId },
      include: { service: { select: { name: true, type: true } } },
    })
    if (existing) {
      return { ok: true, existing: true, order: serializeOrder(existing), charged: 0, newBalance: 0 }
    }
  }

  const fields = await prisma.serviceCustomField.findMany({ where: { serviceId } })
  const values = customFieldValues || {}

  for (const field of fields) {
    if (field.required) {
      const value = values[field.id]
      if (!value || (typeof value === 'string' && !value.trim())) {
        return {
          ok: false,
          code: 'VALIDATION_ERROR',
          message: `Field "${field.label}" is required`,
          status: 400,
        }
      }
    }
  }

  for (const field of fields) {
    const rawValue = values[field.id]
    if (!rawValue) continue
    const value = String(rawValue)
    if (field.fieldType === 'imei_single') {
      const cleaned = value.replace(/\D/g, '')
      if (cleaned.length !== 15) {
        return { ok: false, code: 'VALIDATION_ERROR', message: 'IMEI must be exactly 15 digits', status: 400 }
      }
    }
    if (field.fieldType === 'imei_multi') {
      const lines = value.split('\n').map((l: string) => l.replace(/\D/g, '').trim()).filter(Boolean)
      for (const line of lines) {
        if (line.length !== 15) {
          return { ok: false, code: 'VALIDATION_ERROR', message: `IMEI "${line}" must be exactly 15 digits`, status: 400 }
        }
      }
    }
  }

  const today = new Date()
  const dateStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  let result: unknown = null
  const MAX_RETRIES = 5
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      result = await prisma.$transaction(async (tx) => {
        if (externalId) {
          const dup = await tx.order.findFirst({ where: { userId, externalId } })
          if (dup) throw new Error('DUPLICATE_EXTERNAL_ID')
        }
        const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '')
        const orderCount = await tx.order.count({ where: { createdAt: { gte: dateStart } } })
        const orderNumber = `ORD-${datePrefix}-${String(orderCount + 1).padStart(4, '0')}`

        const userBefore = await tx.user.findUnique({ where: { id: userId } })
        if (!userBefore || userBefore.walletBalance < price) {
          throw new Error('Insufficient balance')
        }

        const newBalance = userBefore.walletBalance - price
        await tx.user.update({
          where: { id: userId },
          data: { walletBalance: { decrement: price }, updatedAt: new Date() },
        })

        await tx.transaction.create({
          data: {
            id: crypto.randomUUID(),
            userId,
            type: 'order_payment',
            amount: -price,
            balanceAfter: newBalance,
            description: `Payment for ${service.name}`,
          },
        })

        const order = await tx.order.create({
          data: {
            id: crypto.randomUUID(),
            orderNumber,
            userId,
            serviceId,
            supplierId: service.supplierId,
            imei: imei || null,
            deviceInfo: deviceInfo || null,
            notes: notes || null,
            externalId: externalId || null,
            source,
            cost: service.cost,
            sellingPrice: price,
            profit: price - service.cost,
            status: 'pending',
          },
        })

        for (const field of fields) {
          const rawValue = values[field.id]
          if (rawValue === undefined || rawValue === null) continue

          let finalValue = String(rawValue)
          if (field.fieldType === 'imei_multi') {
            const str = String(rawValue)
            const uniqueImeis = [...new Set(str.split('\n').map((l: string) => l.replace(/\D/g, '').trim()).filter(Boolean))]
            finalValue = JSON.stringify(uniqueImeis)
          } else if (field.fieldType === 'serial_multi') {
            const str = String(rawValue)
            const uniqueSerials = [...new Set(str.split('\n').map((l: string) => l.trim()).filter(Boolean))]
            finalValue = JSON.stringify(uniqueSerials)
          } else if (field.fieldType === 'multiselect' && Array.isArray(rawValue)) {
            finalValue = JSON.stringify(rawValue)
          }

          await tx.orderCustomFieldValue.create({
            data: {
              id: crypto.randomUUID(),
              orderId: order.id,
              customFieldId: field.id,
              value: finalValue,
            },
          })
        }

        return { order, newBalance }
      })
      break
    } catch (txError: unknown) {
      if (txError instanceof Error && 'code' in txError && txError.code === 'P2002' && attempt < MAX_RETRIES - 1) continue
      if (txError instanceof Error && txError.message === 'DUPLICATE_EXTERNAL_ID') {
        const existing = await prisma.order.findFirst({
          where: { userId, externalId },
          include: { service: { select: { name: true, type: true } } },
        })
        if (existing) return { ok: true, existing: true, order: serializeOrder(existing), charged: 0, newBalance: 0 }
      }
      throw txError
    }
  }

  const created = result as { order: { id: string; orderNumber: string; serviceId: string }; newBalance: number } | null
  if (!created) {
    return { ok: false, code: 'INTERNAL_ERROR', message: 'Order creation failed', status: 500 }
  }

  await createWalletNotification(userId, 'order_payment', price, `Payment for ${service.name}`)
  await createOrderNotification({
    id: created.order.id,
    orderNumber: created.order.orderNumber,
    status: 'pending',
    serviceName: service.name,
    userId,
  })

  await enqueueWebhookEvent({ userId, event: 'order.created', orderId: created.order.id })

  if (service.supplierId) {
    try {
      const job = await createSupplierJob({
        orderId: created.order.id,
        supplierId: service.supplierId,
        requestPayload: JSON.stringify({ imei, deviceInfo, serviceType: service.type }),
      })
      await submitToSupplier(job.id)
    } catch (err) {
      console.error('Supplier job creation failed:', err)
    }
  }

  const order = await prisma.order.findUnique({
    where: { id: created.order.id },
    include: { service: { select: { name: true, type: true } } },
  })
  return {
    ok: true,
    order: serializeOrder(order!),
    charged: price,
    newBalance: created.newBalance,
  }
}

export function serializeOrder(order: {
  id: string
  orderNumber: string
  status: string
  imei: string | null
  deviceInfo: string | null
  notes: string | null
  result: string | null
  sellingPrice: number
  externalId: string | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
  service?: { name: string | null; type: string | null } | null
  customValues?: Array<{
    value: string
    customField?: { label: string | null; fieldType: string | null; visibleToClient: boolean | null } | null
  }>
}) {
  return {
    id: order.externalId || order.id,
    orderId: order.id,
    orderNumber: order.orderNumber,
    externalId: order.externalId,
    status: order.status,
    imei: order.imei,
    deviceInfo: order.deviceInfo,
    notes: order.notes,
    result: order.result,
    sellingPrice: order.sellingPrice,
    completedAt: order.completedAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    serviceName: order.service?.name,
    serviceType: order.service?.type,
    customValues: (order.customValues || [])
      .filter((cv) => cv.customField?.visibleToClient !== false)
      .map((cv) => ({
        label: cv.customField?.label,
        fieldType: cv.customField?.fieldType,
        value: cv.value,
      })),
  }
}