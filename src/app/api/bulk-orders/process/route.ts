import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { bulkOrderProcessSchema, validateBody } from '@/lib/validations'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'
import { createNotification } from '@/lib/notifications'

interface OrderResult {
  imei: string
  orderNumber?: string
  orderId?: string
  status: 'success' | 'failed'
  error?: string
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const validation = validateBody(bulkOrderProcessSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { serviceId, imeis } = validation.data

    const service = await prisma.service.findUnique({ where: { id: serviceId } })
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    if (service.status !== 'active') return NextResponse.json({ error: 'Service is not available' }, { status: 400 })

    const userBefore = await prisma.user.findUnique({ where: { id: user.id } })
    const totalCost = service.sellingPrice * imeis.length
    if ((userBefore?.walletBalance || 0) < totalCost) {
      return NextResponse.json({ error: `Insufficient balance. Required: $${totalCost.toFixed(2)}, Available: $${(userBefore?.walletBalance || 0).toFixed(2)}` }, { status: 400 })
    }

    const batch = await prisma.bulkOrderBatch.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        serviceId,
        fileName: 'bulk-upload',
        totalRecords: imeis.length,
      },
    })

    const results: OrderResult[] = []
    let successCount = 0
    let failCount = 0

    for (const imei of imeis) {
      try {
        const result = await prisma.$transaction(async (tx) => {
          const today = new Date()
          const dateStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
          const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '')
          const orderCount = await tx.order.count({ where: { createdAt: { gte: dateStart } } })
          const orderNumber = `ORD-${datePrefix}-${String(orderCount + 1).padStart(4, '0')}`

          const currentUser = await tx.user.findUnique({ where: { id: user.id } })
          if (!currentUser || currentUser.walletBalance < service.sellingPrice) {
            throw new Error('Insufficient balance')
          }

          const newBalance = currentUser.walletBalance - service.sellingPrice
          await tx.user.update({ where: { id: user.id }, data: { walletBalance: newBalance } })

          await tx.transaction.create({
            data: {
              id: crypto.randomUUID(),
              userId: user.id,
              type: 'order_payment',
              amount: -service.sellingPrice,
              balanceAfter: newBalance,
              description: `Bulk payment for ${service.name}`,
            },
          })

          const profit = service.sellingPrice - service.cost
          const order = await tx.order.create({
            data: {
              id: crypto.randomUUID(),
              orderNumber,
              userId: user.id,
              serviceId,
              supplierId: service.supplierId || null,
              imei,
              status: 'pending',
              cost: service.cost,
              sellingPrice: service.sellingPrice,
              profit,
            },
          })

          return { orderNumber, orderId: order.id }
        })

        results.push({ imei, orderNumber: result.orderNumber, orderId: result.orderId, status: 'success' })
        successCount++
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        results.push({ imei, status: 'failed', error: errorMsg })
        failCount++
      }
    }

    await prisma.bulkOrderBatch.update({
      where: { id: batch.id },
      data: {
        successfulRecords: successCount,
        failedRecords: failCount,
        status: failCount === 0 ? 'completed' : successCount === 0 ? 'failed' : 'completed',
        completedAt: new Date(),
      },
    })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'bulk_order.process',
      entityType: 'bulk_order',
      entityId: batch.id,
      newValues: { serviceId, total: imeis.length, success: successCount, failed: failCount },
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    const notifType = failCount === 0 ? 'success' : successCount === 0 ? 'error' : 'warning'
    const notifMsg = failCount === 0
      ? `All ${successCount} orders created successfully.`
      : `${successCount} succeeded, ${failCount} failed.`
    await createNotification({
      userId: user.id,
      title: 'Bulk Upload Complete',
      message: notifMsg,
      type: notifType,
      link: '/bulk-orders',
    })

    return NextResponse.json({
      batchId: batch.id,
      total: imeis.length,
      successful: successCount,
      failed: failCount,
      results,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    console.error('BulkProcess POST error:', error)
    return NextResponse.json({ error: 'Bulk processing failed' }, { status: 500 })
  }
}
