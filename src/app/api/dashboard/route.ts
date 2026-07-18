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
      processingOrders,
      completedOrders,
      completedToday,
      failedOrders,
      rejectedOrders,
      refundedOrders,
      revenueResult,
      monthRevenueResult,
      profitResult,
      todaySpendingResult,
      userData,
      recentOrders,
      servicesByCategory,
      userRecord,
      lastNotification,
    ] = await Promise.all([
      isAdmin ? prisma.user.count({ where: { status: { not: 'deleted' } } }) : Promise.resolve(1),
      prisma.order.count({ where: userFilter }),
      prisma.service.count({ where: { status: 'active' } }),
      isAdmin ? prisma.supplier.count() : Promise.resolve(0),
      prisma.order.count({ where: { ...userFilter, status: 'pending' } }),
      prisma.order.count({ where: { ...userFilter, status: 'processing' } }),
      prisma.order.count({ where: { ...userFilter, status: 'completed' } }),
      prisma.order.count({
        where: { ...userFilter, status: 'completed', completedAt: { gte: todayStart } },
      }),
      prisma.order.count({ where: { ...userFilter, status: 'failed' } }),
      prisma.order.count({ where: { ...userFilter, status: 'rejected' } }),
      prisma.order.count({ where: { ...userFilter, status: 'refunded' } }),
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
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { userId, createdAt: { gte: todayStart }, amount: { lt: 0 } },
      }),
      prisma.user.findUnique({ where: { id: userId }, select: { walletBalance: true, createdAt: true, name: true, email: true, userId: true } }),
      prisma.order.findMany({
        where: userFilter,
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          service: { select: { name: true, type: true, processingTime: true } },
          user: { select: { name: true } },
        },
      }),
      !isAdmin ? prisma.serviceCategory.findMany({
        where: { services: { some: { status: 'active', clientVisible: true } } },
        select: {
          id: true,
          name: true,
          services: {
            where: { status: 'active', clientVisible: true },
            select: { id: true, status: true, type: true },
          },
        },
      }) : Promise.resolve([]),
      !isAdmin ? prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, userId: true, name: true, email: true, phone: true,
          createdAt: true, status: true, role: true, walletBalance: true,
        },
      }) : Promise.resolve(null),
      !isAdmin ? prisma.notification.findFirst({
        where: { userId, read: false },
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, message: true, type: true, createdAt: true },
      }) : Promise.resolve(null),
    ])

    const processingOrdersCount = isAdmin ? 0 : processingOrders
    const serviceCategories = servicesByCategory.map((cat) => ({
      id: cat.id,
      name: cat.name,
      totalServices: cat.services.length,
      onlineServices: cat.services.filter((s) => s.status === 'active').length,
      offlineServices: cat.services.filter((s) => s.status !== 'active').length,
    }))

    return NextResponse.json({
      totalUsers,
      totalOrders,
      totalServices,
      totalSuppliers,
      pendingOrders,
      processingOrders: processingOrdersCount,
      completedOrders,
      completedToday,
      failedOrders,
      rejectedOrders,
      refundedOrders,
      revenueToday: revenueResult._sum.sellingPrice || 0,
      revenueThisMonth: monthRevenueResult._sum.sellingPrice || 0,
      totalProfit: profitResult._sum.profit || 0,
      todaySpending: Math.abs(todaySpendingResult._sum.amount || 0),
      walletBalance: userData?.walletBalance || 0,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        priority: o.priority,
        imei: o.imei,
        deviceInfo: o.deviceInfo,
        sellingPrice: o.sellingPrice,
        createdAt: o.createdAt,
        completedAt: o.completedAt,
        processingTime: o.service?.processingTime,
        serviceName: o.service?.name,
        serviceType: o.service?.type,
        userName: o.user?.name,
      })),
      serviceCategories,
      userProfile: userRecord,
      lastNotification,
    })
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
