import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { bulkOrderQuerySchema, validateQuery } from '@/lib/validations'

export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const validation = validateQuery(bulkOrderQuerySchema, searchParams)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { page, limit } = validation.data
    const offset = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (user.role !== 'admin') where.userId = user.id

    const [total, batches] = await Promise.all([
      prisma.bulkOrderBatch.count({ where }),
      prisma.bulkOrderBatch.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          service: { select: { name: true } },
          user: { select: { name: true, email: true } },
        },
      }),
    ])

    return NextResponse.json({
      batches: batches.map(b => ({
        ...b,
        serviceName: b.service?.name,
        userName: b.user?.name,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    console.error('BulkOrders GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch bulk orders' }, { status: 500 })
  }
}
