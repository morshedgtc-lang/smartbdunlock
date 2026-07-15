import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '30d'

    const now = new Date()
    let startDate: Date
    switch (range) {
      case '7d': startDate = new Date(now.getTime() - 7 * 86400000); break
      case '30d': startDate = new Date(now.getTime() - 30 * 86400000); break
      case '90d': startDate = new Date(now.getTime() - 90 * 86400000); break
      case '1y': startDate = new Date(now.getTime() - 365 * 86400000); break
      default: startDate = new Date(now.getTime() - 30 * 86400000)
    }

    const [
      totalRevenue,
      totalProfit,
      totalOrders,
      completedOrders,
      pendingOrders,
      failedOrders,
      cancelledOrders,
      activeUsers,
      totalUsers,
      activeServices,
      totalSuppliers,
      avgOrderValue,
    ] = await Promise.all([
      prisma.order.aggregate({ _sum: { sellingPrice: true }, where: { status: 'completed', completedAt: { gte: startDate } } }),
      prisma.order.aggregate({ _sum: { profit: true }, where: { status: 'completed', completedAt: { gte: startDate } } }),
      prisma.order.count({ where: { createdAt: { gte: startDate } } }),
      prisma.order.count({ where: { status: 'completed', completedAt: { gte: startDate } } }),
      prisma.order.count({ where: { status: 'pending', createdAt: { gte: startDate } } }),
      prisma.order.count({ where: { status: 'failed', createdAt: { gte: startDate } } }),
      prisma.order.count({ where: { status: 'cancelled', createdAt: { gte: startDate } } }),
      prisma.user.count({ where: { status: 'active', role: 'reseller' } }),
      prisma.user.count({ where: { role: 'reseller' } }),
      prisma.service.count({ where: { status: 'active' } }),
      prisma.supplier.count(),
      prisma.order.aggregate({ _avg: { sellingPrice: true }, where: { status: 'completed', completedAt: { gte: startDate } } }),
    ])

    // Daily revenue for chart (last 30 days)
    const dailyRevenue: { date: string; revenue: number; orders: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 86400000)
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate())
      const dayEnd = new Date(dayStart.getTime() + 86400000)

      const [dayRev, dayOrd] = await Promise.all([
        prisma.order.aggregate({ _sum: { sellingPrice: true }, where: { status: 'completed', completedAt: { gte: dayStart, lt: dayEnd } } }),
        prisma.order.count({ where: { status: 'completed', completedAt: { gte: dayStart, lt: dayEnd } } }),
      ])

      dailyRevenue.push({
        date: dayStart.toISOString().slice(0, 10),
        revenue: dayRev._sum.sellingPrice || 0,
        orders: dayOrd,
      })
    }

    // Top services
    const topServices = await prisma.order.groupBy({
      by: ['serviceId'],
      _count: { id: true },
      _sum: { sellingPrice: true, profit: true },
      where: { status: 'completed', completedAt: { gte: startDate } },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    })

    const serviceIds = topServices.map(s => s.serviceId)
    const services = await prisma.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true, name: true } })
    const serviceMap = Object.fromEntries(services.map(s => [s.id, s.name]))

    const topServicesWithNames = topServices.map(s => ({
      name: serviceMap[s.serviceId] || 'Unknown',
      orders: s._count.id,
      revenue: s._sum.sellingPrice || 0,
      profit: s._sum.profit || 0,
    }))

    // Top users by spend
    const topUsers = await prisma.order.groupBy({
      by: ['userId'],
      _count: { id: true },
      _sum: { sellingPrice: true },
      where: { status: 'completed', completedAt: { gte: startDate } },
      orderBy: { _sum: { sellingPrice: 'desc' } },
      take: 10,
    })

    const userIds = topUsers.map(u => u.userId)
    const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
    const userMap = Object.fromEntries(users.map(u => [u.id, u]))

    const topUsersWithNames = topUsers.map(u => ({
      name: userMap[u.userId]?.name || 'Unknown',
      email: userMap[u.userId]?.email || '',
      orders: u._count.id,
      spent: u._sum.sellingPrice || 0,
    }))

    // Order status distribution
    const statusDistribution = [
      { status: 'completed', count: completedOrders },
      { status: 'pending', count: pendingOrders },
      { status: 'failed', count: failedOrders },
      { status: 'cancelled', count: cancelledOrders },
    ]

    return NextResponse.json({
      summary: {
        revenue: totalRevenue._sum.sellingPrice || 0,
        profit: totalProfit._sum.profit || 0,
        totalOrders,
        completedOrders,
        pendingOrders,
        failedOrders,
        cancelledOrders,
        activeUsers,
        totalUsers,
        activeServices,
        totalSuppliers,
        avgOrderValue: avgOrderValue._avg.sellingPrice || 0,
        conversionRate: totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : '0',
      },
      dailyRevenue,
      topServices: topServicesWithNames,
      topUsers: topUsersWithNames,
      statusDistribution,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown'
    if (msg === 'Unauthorized') return NextResponse.json({ error: msg }, { status: 401 })
    if (msg === 'Forbidden') return NextResponse.json({ error: msg }, { status: 403 })
    console.error('Reporting error:', error)
    return NextResponse.json({ error: 'Failed to load report data' }, { status: 500 })
  }
}
