import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    const user = await requireAuth()
    const isAdmin = user.role === 'admin'
    const userId = user.id

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const userFilter = isAdmin ? {} : { userId }

    const [
      totalUsers,
      totalOrders,
      totalServices,
      totalSuppliers,
      pendingOrders,
      completedOrders,
      completedToday,
      failedOrders,
      revenueResult,
      monthRevenueResult,
      profitResult,
      userData,
      recentOrders,
    ] = await Promise.all([
      isAdmin ? prisma.user.count() : Promise.resolve(1),
      prisma.order.count({ where: userFilter }),
      prisma.service.count({ where: { status: 'active' } }),
      isAdmin ? prisma.supplier.count() : Promise.resolve(0),
      prisma.order.count({ where: { ...userFilter, status: 'pending' } }),
      prisma.order.count({ where: { ...userFilter, status: 'completed' } }),
      prisma.order.count({
        where: { ...userFilter, status: 'completed', completedAt: { gte: todayStart } },
      }),
      prisma.order.count({ where: { ...userFilter, status: 'failed' } }),
      prisma.order.aggregate({
        _sum: { sellingPrice: true },
        where: { ...userFilter, status: 'completed', completedAt: { gte: todayStart } },
      }),
      prisma.order.aggregate({
        _sum: { sellingPrice: true },
        where: { ...userFilter, status: 'completed', completedAt: { gte: monthStart } },
      }),
      prisma.order.aggregate({
        _sum: { profit: true },
        where: { ...userFilter, status: 'completed' },
      }),
      prisma.user.findUnique({ where: { id: userId }, select: { walletBalance: true } }),
      prisma.order.findMany({
        where: userFilter,
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { service: { select: { name: true } }, user: { select: { name: true } } },
      }),
    ])

    return NextResponse.json({
      totalUsers,
      totalOrders,
      totalServices,
      totalSuppliers,
      pendingOrders,
      completedOrders,
      completedToday,
      failedOrders,
      revenueToday: revenueResult._sum.sellingPrice || 0,
      revenueThisMonth: monthRevenueResult._sum.sellingPrice || 0,
      totalProfit: profitResult._sum.profit || 0,
      walletBalance: userData?.walletBalance || 0,
      recentOrders: recentOrders.map(o => ({
        ...o,
        serviceName: o.service?.name,
        userName: o.user?.name,
      })),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
