import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = session.user.role === 'admin'
    const userId = session.user.id
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1)

    const where = isAdmin ? {} : { userId }

    const [
      totalUsers,
      totalOrders,
      totalServices,
      totalSuppliers,
      recentOrders,
      pendingOrders,
      completedOrders,
      completedToday,
      failedOrders,
      revenueToday,
      revenueThisMonth,
      totalProfit,
      walletUser,
    ] = await Promise.all([
      isAdmin ? prisma.user.count() : Promise.resolve(1),
      prisma.order.count({ where }),
      prisma.service.count({ where: { status: 'active' } }),
      isAdmin ? prisma.supplier.count() : Promise.resolve(0),
      prisma.order.findMany({
        where,
        include: {
          service: { select: { name: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      prisma.order.count({ where: { ...where, status: 'pending' } }),
      prisma.order.count({ where: { ...where, status: 'completed' } }),
      prisma.order.count({ where: { ...where, status: 'completed', completedAt: { gte: todayStart } } }),
      prisma.order.count({ where: { ...where, status: 'failed' } }),
      prisma.order.aggregate({
        _sum: { sellingPrice: true },
        where: { ...where, status: 'completed', completedAt: { gte: todayStart } },
      }),
      prisma.order.aggregate({
        _sum: { sellingPrice: true },
        where: { ...where, status: 'completed', completedAt: { gte: monthStart } },
      }),
      prisma.order.aggregate({
        _sum: { profit: true },
        where: { ...where, status: 'completed' },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { walletBalance: true },
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
      revenueToday: revenueToday._sum.sellingPrice || 0,
      revenueThisMonth: revenueThisMonth._sum.sellingPrice || 0,
      totalProfit: totalProfit._sum.profit || 0,
      walletBalance: walletUser?.walletBalance || 0,
      recentOrders,
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
