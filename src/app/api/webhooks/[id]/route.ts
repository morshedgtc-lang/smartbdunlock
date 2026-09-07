import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'
import { validateBody } from '@/lib/validations'
import { encodeWebhookSecret, WEBHOOK_EVENTS } from '@/lib/webhooks'

const webhookUpdateSchema = z.object({
  url: z.string().url('Invalid URL').optional(),
  secret: z.string().optional(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).optional(),
  status: z.enum(['active', 'disabled']).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const validation = validateBody(webhookUpdateSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { url, secret, events, status } = validation.data

    const existing = await prisma.webhook.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })

    const data: Record<string, unknown> = {}
    if (url !== undefined) data.url = url
    if (secret != null && secret.length > 0) data.secretEncrypted = encodeWebhookSecret(secret)
    if (events !== undefined) data.events = JSON.stringify(events)
    if (status !== undefined) data.status = status

    const webhook = await prisma.webhook.update({ where: { id }, data })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'webhook.update',
      entityType: 'webhook',
      entityId: id,
      newValues: { status: webhook.status },
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({
      webhook: {
        id: webhook.id,
        userId: webhook.userId,
        url: webhook.url,
        hasSecret: !!webhook.secretEncrypted,
        events: safeParseEvents(webhook.events),
        status: webhook.status,
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('Webhook PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update webhook' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin()
    const { id } = await params
    const existing = await prisma.webhook.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })

    await prisma.webhook.delete({ where: { id } })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'webhook.delete',
      entityType: 'webhook',
      entityId: id,
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('Webhook DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 })
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