import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const today = new Date()
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    const [total, byStatus, todayRevenueAgg] = await Promise.all([
      prisma.order.count(),
      prisma.order.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.transaction.aggregate({
        where: {
          type: 'order_payment',
          createdAt: { gte: dayStart },
        },
        _sum: { amount: true },
      }),
    ])

    const counts: Record<string, number> = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      rejected: 0,
      refunded: 0,
    }
    for (const row of byStatus) {
      counts[row.status] = row._count._all
    }

    const todayRevenue = Math.abs(todayRevenueAgg._sum.amount || 0)

    return NextResponse.json({
      total,
      counts,
      todayRevenue,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    console.error('Orders summary error:', error)
    return NextResponse.json({ error: 'Failed to load summary' }, { status: 500 })
  }
}
