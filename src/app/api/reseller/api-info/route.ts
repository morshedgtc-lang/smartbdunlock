import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    const user = await requireAuth()

    const [apiKeys, webhook, recentLogs] = await Promise.all([
      prisma.apiKey.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          status: true,
          permissions: true,
          requestLimit: true,
          totalRequests: true,
          lastUsedAt: true,
          createdAt: true,
        },
      }),
      prisma.webhook.findUnique({
        where: { userId: user.id },
        select: {
          id: true,
          url: true,
          secretEncrypted: true,
          events: true,
          status: true,
          updatedAt: true,
          _count: {
            select: {
              deliveries: true,
            },
          },
        },
      }),
      prisma.apiRequestLog.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          requestId: true,
          endpoint: true,
          method: true,
          statusCode: true,
          createdAt: true,
        },
      }),
    ])

    return NextResponse.json({
      apiKeys,
      webhook: webhook
        ? {
            id: webhook.id,
            url: webhook.url,
            hasSecret: !!webhook.secretEncrypted,
            subscribedEvents: safeParseEvents(webhook.events),
            status: webhook.status,
            updatedAt: webhook.updatedAt,
            deliveryCount: webhook._count.deliveries,
          }
        : null,
      recentLogs,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    console.error('Reseller api-info GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch API info' }, { status: 500 })
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