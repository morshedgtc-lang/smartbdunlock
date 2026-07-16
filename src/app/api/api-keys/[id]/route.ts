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

    const apiKey = await prisma.apiKey.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        userId: true,
        status: true,
        permissions: true,
        requestLimit: true,
        totalRequests: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    })

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const usageByDay = await prisma.auditLog.groupBy({
      by: ['createdAt'],
      where: {
        entityId: id,
        entityType: 'api_key',
        action: 'api_key.external_request',
        createdAt: { gte: sevenDaysAgo },
      },
      _count: { id: true },
    })

    const dailyUsage: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      dailyUsage[key] = 0
    }

    for (const entry of usageByDay) {
      const day = entry.createdAt.toISOString().slice(0, 10)
      if (day in dailyUsage) {
        dailyUsage[day] += entry._count.id
      }
    }

    return NextResponse.json({
      key: apiKey,
      usage: {
        totalRequests: apiKey.totalRequests,
        lastUsedAt: apiKey.lastUsedAt,
        byDay: Object.entries(dailyUsage).map(([date, count]) => ({ date, count })),
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('API Key detail GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch API key details' }, { status: 500 })
  }
}
