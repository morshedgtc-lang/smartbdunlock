import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'
import { validateBody } from '@/lib/validations'
import { encodeWebhookSecret, sendWebhookTest } from '@/lib/webhooks'
import { WEBHOOK_EVENTS } from '@/lib/webhook-utils'
import { csrfOk, csrfError } from '@/lib/csrf'

const resellerWebhookSchema = z
  .object({
    url: z
      .string()
      .url('Invalid URL')
      .refine((u) => u.startsWith('http://') || u.startsWith('https://'), {
        message: 'URL must start with http:// or https://',
      })
      .optional(),
    events: z.array(z.enum(WEBHOOK_EVENTS)).optional(),
    secret: z.string().min(8, 'Secret must be at least 8 characters').optional(),
    generate_secret: z.boolean().optional(),
    status: z.enum(['active', 'disabled']).optional(),
    action: z.enum(['test']).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action !== 'test' && !data.url) {
      ctx.addIssue({ code: 'custom', path: ['url'], message: 'URL is required' })
    }
  })

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    if (!(await csrfOk(request))) {
      return NextResponse.json(csrfError(), { status: 403 })
    }

    const body = await request.json()
    const validation = validateBody(resellerWebhookSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { url, events, secret, generate_secret, status, action } = validation.data

    if (action === 'test') {
      const result = await sendWebhookTest(user.id)
      return NextResponse.json(result)
    }

    const existing = await prisma.webhook.findUnique({ where: { userId: user.id } })

    let generatedSecret: string | undefined
    let rotated = false
    if (generate_secret) {
      generatedSecret = randomBytes(32).toString('hex')
      rotated = true
    } else if (secret && secret.length > 0) {
      generatedSecret = secret
      rotated = true
    }

    const data: Record<string, unknown> = {
      url: url!,
      status: status || 'active',
    }
    if (rotated) data.secretEncrypted = encodeWebhookSecret(generatedSecret!)
    if (events) data.events = JSON.stringify(events)

    const webhook = await prisma.webhook.upsert({
      where: { userId: user.id },
      update: data,
      create: {
        userId: user.id,
        url: url!,
        secretEncrypted: rotated ? encodeWebhookSecret(generatedSecret!) : null,
        events: events ? JSON.stringify(events) : JSON.stringify([...WEBHOOK_EVENTS]),
        status: status || 'active',
      },
    })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'webhook.upsert',
      entityType: 'webhook',
      entityId: webhook.id,
      newValues: { url: redactUrl(url!), secretRotated: rotated, status: webhook.status },
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    const newlyCreated = !existing
    return NextResponse.json(
      {
        webhook: {
          id: webhook.id,
          userId: webhook.userId,
          url: webhook.url,
          hasSecret: !!webhook.secretEncrypted,
          events: safeParseEvents(webhook.events),
          status: webhook.status,
        },
        generatedSecret: rotated ? generatedSecret : undefined,
        newlyCreated,
      },
      { status: newlyCreated ? 201 : 200 },
    )
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('Reseller webhook POST error:', error)
    return NextResponse.json({ error: 'Failed to save webhook' }, { status: 500 })
  }
}

function safeParseEvents(eventsJson: string | null): string[] {
  try {
    const parsed = JSON.parse(eventsJson || '[]')
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function redactUrl(url: string): string {
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.host}${u.pathname}`
  } catch {
    return url
  }
}