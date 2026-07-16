import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/auth'
import { depositRequestSchema, depositRequestUpdateSchema, depositRequestQuerySchema, validateBody, validateQuery } from '@/lib/validations'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'
import { createNotification } from '@/lib/notifications'

export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const validation = validateQuery(depositRequestQuerySchema, searchParams)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { status, page, limit } = validation.data
    const offset = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (user.role !== 'admin') where.userId = user.id
    if (status) where.status = status

    const [total, requests] = await Promise.all([
      prisma.depositRequest.count({ where }),
      prisma.depositRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ])

    return NextResponse.json({
      requests: requests.map(r => ({
        ...r,
        userName: r.user?.name,
        userEmail: r.user?.email,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    console.error('DepositRequests GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch deposit requests' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const validation = validateBody(depositRequestSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { amount, method, transactionId, screenshot } = validation.data

    const depositRequest = await prisma.depositRequest.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        amount,
        method,
        transactionId: transactionId || null,
        screenshot: screenshot || null,
      },
    })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'deposit_request.create',
      entityType: 'deposit_request',
      entityId: depositRequest.id,
      newValues: { amount, method, transactionId },
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    const admins = await prisma.user.findMany({ where: { role: 'admin', status: 'active' } })
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        title: 'New Deposit Request',
        message: `${user.name} requested $${amount.toFixed(2)} deposit via ${method}.`,
        type: 'info',
        link: '/admin/deposit-requests',
      })
    }

    return NextResponse.json(depositRequest, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    console.error('DepositRequests POST error:', error)
    return NextResponse.json({ error: 'Failed to create deposit request' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin()
    const body = await request.json()
    const validation = validateBody(depositRequestUpdateSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { id, status, adminNote } = validation.data

    const existing = await prisma.depositRequest.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    if (existing.status !== 'pending') return NextResponse.json({ error: 'Request already processed' }, { status: 400 })

    if (status === 'approved') {
      const result = await prisma.$transaction(async (tx) => {
        const userBefore = await tx.user.findUnique({ where: { id: existing.userId } })
        const newBalance = (userBefore?.walletBalance || 0) + existing.amount
        await tx.user.update({
          where: { id: existing.userId },
          data: { walletBalance: { increment: existing.amount } },
        })
        await tx.transaction.create({
          data: {
            id: crypto.randomUUID(),
            userId: existing.userId,
            type: 'deposit',
            amount: existing.amount,
            balanceAfter: newBalance,
            description: `Deposit approved via ${existing.method}`,
          },
        })
        await tx.depositRequest.update({
          where: { id },
          data: { status: 'approved', adminNote: adminNote || null, approvedBy: admin.id, approvedAt: new Date() },
        })
        return { newBalance }
      })

      await createNotification({
        userId: existing.userId,
        title: 'Deposit Approved',
        message: `$${existing.amount.toFixed(2)} has been added to your wallet.`,
        type: 'success',
        link: '/wallet',
      })

      await auditLog({
        userId: admin.id,
        userEmail: admin.email,
        action: 'deposit_request.approve',
        entityType: 'deposit_request',
        entityId: id,
        newValues: { status: 'approved', amount: existing.amount, adminNote },
        ip: getClientIp(request),
        userAgent: getClientUserAgent(request),
      })

      return NextResponse.json({ success: true, newBalance: result.newBalance })
    } else {
      await prisma.depositRequest.update({
        where: { id },
        data: { status: 'rejected', adminNote: adminNote || null, approvedBy: admin.id, approvedAt: new Date() },
      })

      await createNotification({
        userId: existing.userId,
        title: 'Deposit Rejected',
        message: `Your $${existing.amount.toFixed(2)} deposit request was rejected. ${adminNote || ''}`,
        type: 'error',
        link: '/wallet',
      })

      await auditLog({
        userId: admin.id,
        userEmail: admin.email,
        action: 'deposit_request.reject',
        entityType: 'deposit_request',
        entityId: id,
        newValues: { status: 'rejected', adminNote },
        ip: getClientIp(request),
        userAgent: getClientUserAgent(request),
      })

      return NextResponse.json({ success: true })
    }
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('DepositRequests PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update deposit request' }, { status: 500 })
  }
}
