import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { syncHistoryQuerySchema, validateQuery } from '@/lib/validations'

export async function GET(request: Request) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const validation = validateQuery(syncHistoryQuerySchema, searchParams)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { providerId, status, page, limit } = validation.data

    const where: Record<string, unknown> = {}
    if (providerId) where.providerId = providerId
    if (status) where.status = status

    const [histories, total] = await Promise.all([
      prisma.syncHistory.findMany({
        where,
        include: { provider: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.syncHistory.count({ where }),
    ])

    return NextResponse.json({ histories, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    console.error('Sync history GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch sync history' }, { status: 500 })
  }
}
