import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'
import { validateBody } from '@/lib/validations'
import { encodeWebhookSecret, sendWebhookTest, WEBHOOK_EVENTS } from '@/lib/webhooks'

const webhookUpsertSchema = z
  .object({
    userId: z.string().min(1, 'Reseller is required'),
    url: z.string().url('Invalid URL').refine((u) => u.startsWith('http://') || u.startsWith('https://'), {
      message: 'URL must start with http:// or https://',
    }).optional(),
    secret: z.string().optional(),
    events: z.array(z.enum(WEBHOOK_EVENTS)).optional(),
    status: z.enum(['active', 'disabled']).optional(),
    action: z.enum(['test']).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action !== 'test' && !data.url) {
      ctx.addIssue({ code: 'custom', path: ['url'], message: 'URL is required' })
    }
  })

export async function GET() {
  try {
    await requireAdmin()
    const webhooks = await prisma.webhook.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, name: true, role: true, status: true } },
      },
    })

    const counts = await prisma.webhookDelivery.groupBy({
      by: ['webhookId', 'status'],
      _count: { _all: true },
    })

    const countMap = new Map<string, { success: number; failed: number; pending: number }>()
    for (const row of counts) {
      const entry = countMap.get(row.webhookId) || { success: 0, failed: 0, pending: 0 }
      if (row.status === 'success') entry.success = row._count._all
      else if (row.status === 'failed') entry.failed = row._count._all
      else entry.pending = row._count._all
      countMap.set(row.webhookId, entry)
    }

    return NextResponse.json({
      webhooks: webhooks.map((w) => ({
        id: w.id,
        userId: w.userId,
        reseller: w.user,
        url: w.url,
        hasSecret: !!w.secretEncrypted,
        events: safeParseEvents(w.events),
        status: w.status,
        updatedAt: w.updatedAt,
        deliveries: countMap.get(w.id) || { success: 0, failed: 0, pending: 0 },
      })),
    })
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('Webhooks GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin()
    const body = await request.json()
    const validation = validateBody(webhookUpsertSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { userId, url, secret, events, status, action } = validation.data

    const target = await prisma.user.findUnique({ where: { id: userId } })
    if (!target || target.role !== 'reseller') {
      return NextResponse.json({ error: 'Reseller not found' }, { status: 404 })
    }

    if (action === 'test') {
      const result = await sendWebhookTest(userId)
      return NextResponse.json(result)
    }

    const existing = await prisma.webhook.findUnique({ where: { userId } })
    const rotated = !!(secret && secret.length > 0)

    const data: Record<string, unknown> = {
      url: url!,
      status: status || 'active',
    }
    if (rotated) data.secretEncrypted = encodeWebhookSecret(secret!)
    if (events) data.events = JSON.stringify(events)

    const webhook = await prisma.webhook.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        url: url!,
        secretEncrypted: rotated ? encodeWebhookSecret(secret!) : null,
        events: events ? JSON.stringify(events) : undefined,
        status: status || 'active',
      },
    })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'webhook.upsert',
      entityType: 'webhook',
      entityId: webhook.id,
      newValues: { userId, url: redactUrl(url!), secretRotated: rotated, status: webhook.status },
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    const newlyCreated = !existing
    return NextResponse.json({
      webhook: {
        id: webhook.id,
        userId: webhook.userId,
        url: webhook.url,
        hasSecret: !!webhook.secretEncrypted,
        events: safeParseEvents(webhook.events),
        status: webhook.status,
      },
      generatedSecret: rotated ? secret : undefined,
      newlyCreated,
    }, { status: newlyCreated ? 201 : 200 })
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('Webhooks POST error:', error)
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