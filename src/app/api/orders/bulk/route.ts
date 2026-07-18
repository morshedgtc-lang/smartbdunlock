import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'

interface BulkBody {
  ids: string[]
  action: 'delete' | 'status' | 'assign' | 'refund'
  status?: string
  assignedTo?: string | null
}

const REFUNDABLE = ['failed', 'cancelled', 'rejected']

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await request.json()) as BulkBody
    const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : []
    if (ids.length === 0) {
      return NextResponse.json({ error: 'No orders selected' }, { status: 400 })
    }

    let affected = 0

    if (body.action === 'delete') {
      await prisma.order.deleteMany({ where: { id: { in: ids } } })
      affected = ids.length
      await auditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'order.bulk_delete',
        entityType: 'order',
        newValues: { count: ids.length },
        ip: getClientIp(request),
        userAgent: getClientUserAgent(request),
      })
    } else if (body.action === 'status') {
      if (!body.status) {
        return NextResponse.json({ error: 'Status is required' }, { status: 400 })
      }
      const orders = await prisma.order.findMany({ where: { id: { in: ids } } })
      const valid = orders.filter((o) => o.status !== body.status)
      await prisma.$transaction(async (tx) => {
        for (const o of valid) {
          await tx.order.update({
            where: { id: o.id },
            data: {
              status: body.status!,
              completedAt: body.status === 'completed' ? new Date() : o.completedAt,
            },
          })
          await tx.orderNote.create({
            data: {
              id: crypto.randomUUID(),
              orderId: o.id,
              authorId: user.id,
              authorName: 'System',
              content: `Status changed from "${o.status}" to "${body.status}" (bulk)`,
              visible: true,
            },
          })
          if (body.status === 'completed' && o.status !== 'completed' && o.supplierId) {
            await tx.supplier.update({
              where: { id: o.supplierId },
              data: { totalOrders: { increment: 1 } },
            })
          }
          if (REFUNDABLE.includes(body.status!) && ['pending', 'processing'].includes(o.status)) {
            const newBalance = o.sellingPrice
            await tx.user.update({
              where: { id: o.userId },
              data: { walletBalance: { increment: o.sellingPrice } },
            })
            await tx.transaction.create({
              data: {
                id: crypto.randomUUID(),
                userId: o.userId,
                orderId: o.id,
                type: 'order_refund',
                amount: o.sellingPrice,
                balanceAfter: newBalance,
                description: `Refund for ${o.orderNumber}`,
              },
            })
          }
        }
      })
      affected = valid.length
    } else if (body.action === 'assign') {
      await prisma.order.updateMany({
        where: { id: { in: ids } },
        data: { assignedTo: body.assignedTo || null },
      })
      affected = ids.length
    } else if (body.action === 'refund') {
      const orders = await prisma.order.findMany({ where: { id: { in: ids } } })
      await prisma.$transaction(async (tx) => {
        for (const o of orders) {
          const newBalance = o.sellingPrice
          await tx.user.update({
            where: { id: o.userId },
            data: { walletBalance: { increment: o.sellingPrice } },
          })
          await tx.transaction.create({
            data: {
              id: crypto.randomUUID(),
              userId: o.userId,
              orderId: o.id,
              type: 'order_refund',
              amount: o.sellingPrice,
              balanceAfter: newBalance,
              description: `Refund for ${o.orderNumber}`,
            },
          })
          await tx.orderNote.create({
            data: {
              id: crypto.randomUUID(),
              orderId: o.id,
              authorId: user.id,
              authorName: 'System',
              content: `Refunded $${o.sellingPrice.toFixed(2)} (bulk)`,
              visible: false,
            },
          })
        }
      })
      affected = orders.length
    }

    return NextResponse.json({ success: true, affected })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    console.error('Bulk orders error:', error)
    return NextResponse.json({ error: 'Bulk action failed' }, { status: 500 })
  }
}
