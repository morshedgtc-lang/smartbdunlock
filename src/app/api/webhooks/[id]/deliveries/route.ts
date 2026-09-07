import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
    const { id } = await params

    const webhook = await prisma.webhook.findUnique({ where: { id } })
    if (!webhook) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })

    const limit = Math.min(parseInt(new URL(request.url).searchParams.get('limit') || '50'), 200)

    const deliveries = await prisma.webhookDelivery.findMany({
      where: { webhookId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({
      deliveries: deliveries.map((d) => ({
        id: d.id,
        event: d.event,
        status: d.status,
        attempts: d.attempts,
        ttlAttempts: d.maxAttempts,
        responseCode: d.responseCode,
        error: d.error,
        nextAttemptAt: d.nextAttemptAt,
        lastAttemptAt: d.lastAttemptAt,
        createdAt: d.createdAt,
        payload: safeTruncate(d.payload),
      })),
    })
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('Webhook deliveries GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch deliveries' }, { status: 500 })
  }
}

function safeTruncate(payload: string | null): string | null {
  if (!payload) return null
  return payload.length > 2000 ? `${payload.slice(0, 2000)}…` : payload
}