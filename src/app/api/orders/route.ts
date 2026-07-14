import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { ordersQuerySchema, createOrderSchema, updateOrderSchema, validateBody, validateQuery } from '@/lib/validations'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'

export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const validation = validateQuery(ordersQuerySchema, searchParams)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { search, status, page, limit } = validation.data
    const offset = (page - 1) * limit

    const where: any = {}
    if (user.role !== 'admin') where.userId = user.id
    if (status) where.status = status
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { imei: { contains: search, mode: 'insensitive' } },
        { deviceInfo: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          service: { select: { name: true, type: true } },
          supplier: { select: { name: true } },
          user: { select: { name: true, email: true } },
          customValues: { include: { customField: { select: { label: true, fieldType: true } } } },
        },
      }),
    ])

    return NextResponse.json({
      orders: orders.map(o => ({
        ...o,
        serviceName: o.service?.name,
        serviceType: o.service?.type,
        supplierName: o.supplier?.name,
        userName: o.user?.name,
        userEmail: o.user?.email,
        customValues: o.customValues.map(cv => ({
          ...cv,
          label: cv.customField?.label,
          fieldType: cv.customField?.fieldType,
        })),
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    console.error('Orders GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const validation = validateBody(createOrderSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { serviceId, imei, deviceInfo, notes, customFieldValues } = validation.data

    const service = await prisma.service.findUnique({ where: { id: serviceId } })
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    if (service.status !== 'active') return NextResponse.json({ error: 'Service is not available' }, { status: 400 })

    const fields = await prisma.serviceCustomField.findMany({ where: { serviceId } })

    for (const field of fields) {
      if (field.required) {
        const value = customFieldValues[field.id]
        if (!value || (typeof value === 'string' && !value.trim())) {
          return NextResponse.json({ error: `Field "${field.label}" is required` }, { status: 400 })
        }
      }
    }

    for (const field of fields) {
      const rawValue = customFieldValues[field.id]
      if (!rawValue) continue
      const value = String(rawValue)
      if (field.fieldType === 'imei_single') {
        const cleaned = value.replace(/\D/g, '')
        if (cleaned.length !== 15) return NextResponse.json({ error: 'IMEI must be exactly 15 digits' }, { status: 400 })
      }
      if (field.fieldType === 'imei_multi') {
        const lines = value.split('\n').map((l: string) => l.replace(/\D/g, '').trim()).filter(Boolean)
        for (const line of lines) {
          if (line.length !== 15) return NextResponse.json({ error: `IMEI "${line}" must be exactly 15 digits` }, { status: 400 })
        }
      }
    }

    const today = new Date()
    const dateStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '')

    let result: unknown = null
    const MAX_RETRIES = 5
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        result = await prisma.$transaction(async (tx) => {
          const orderCount = await tx.order.count({ where: { createdAt: { gte: dateStart } } })
          const orderNumber = `ORD-${datePrefix}-${String(orderCount + 1).padStart(4, '0')}`
          const userBefore = await tx.user.findUnique({ where: { id: user.id } })
          if (!userBefore || userBefore.walletBalance < service.sellingPrice) {
            throw new Error('Insufficient balance')
          }

          const newBalance = userBefore.walletBalance - service.sellingPrice
          await tx.user.update({ where: { id: user.id }, data: { walletBalance: newBalance } })

          await tx.transaction.create({
            data: {
              id: crypto.randomUUID(),
              userId: user.id,
              type: 'order_payment',
              amount: -service.sellingPrice,
              balanceAfter: newBalance,
              description: `Payment for ${service.name}`,
            },
          })

          const profit = service.sellingPrice - service.cost
          const order = await tx.order.create({
            data: {
              id: crypto.randomUUID(),
              orderNumber,
              userId: user.id,
              serviceId,
              supplierId: service.supplierId,
              imei: imei || null,
              deviceInfo: deviceInfo || null,
              notes: notes || null,
              cost: service.cost,
              sellingPrice: service.sellingPrice,
              profit,
              status: 'pending',
            },
          })

          for (const field of fields) {
            const rawValue = customFieldValues[field.id]
            if (rawValue === undefined || rawValue === null) continue

            let finalValue = String(rawValue)
            if (field.fieldType === 'imei_multi') {
              const str = String(rawValue)
              const uniqueImeis = [...new Set(str.split('\n').map((l: string) => l.replace(/\D/g, '').trim()).filter(Boolean))]
              finalValue = JSON.stringify(uniqueImeis)
            } else if (field.fieldType === 'serial_multi') {
              const str = String(rawValue)
              const uniqueSerials = [...new Set(str.split('\n').map((l: string) => l.trim()).filter(Boolean))]
              finalValue = JSON.stringify(uniqueSerials)
            } else if (field.fieldType === 'multiselect' && Array.isArray(rawValue)) {
              finalValue = JSON.stringify(rawValue)
            }

            await tx.orderCustomFieldValue.create({
              data: {
                id: crypto.randomUUID(),
                orderId: order.id,
                customFieldId: field.id,
                value: finalValue,
              },
            })
          }

          return order
        })
        break
      } catch (txError: any) {
        if (txError.code === 'P2002' && attempt < MAX_RETRIES - 1) continue
        throw txError
      }
    }

    const orderResult = result as Record<string, unknown> | null
    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'order.create',
      entityType: 'order',
      entityId: orderResult?.id as string | undefined,
      newValues: { serviceId, imei, orderNumber: orderResult?.orderNumber },
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    console.error('Orders POST error:', error)
    return NextResponse.json({ error: error.message || 'Order creation failed' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const validation = validateBody(updateOrderSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { id, status, notes, result } = validation.data

    const order = await prisma.order.findUnique({ where: { id } })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (user.role !== 'admin' && order.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data: any = {}

    if (notes !== undefined) data.notes = notes

    if (status && status !== order.status) {
      if (user.role !== 'admin') {
        return NextResponse.json({ error: 'Only admin can change order status' }, { status: 403 })
      }
      data.status = status
      data.completedAt = status === 'completed' ? new Date() : order.completedAt
    }

    if (result !== undefined && user.role === 'admin') {
      data.result = result
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data,
      })

      if (data.status && data.status === 'completed' && order.status !== 'completed' && order.supplierId) {
        await tx.supplier.update({
          where: { id: order.supplierId },
          data: { totalOrders: { increment: 1 } },
        })
      }

      if (data.status && ['failed', 'cancelled'].includes(data.status) && ['pending', 'processing'].includes(order.status)) {
        const userBefore = await tx.user.findUnique({ where: { id: order.userId } })
        const newBalance = (userBefore?.walletBalance || 0) + order.sellingPrice
        await tx.user.update({ where: { id: order.userId }, data: { walletBalance: { increment: order.sellingPrice } } })
        await tx.transaction.create({
          data: {
            id: crypto.randomUUID(),
            userId: order.userId,
            orderId: id,
            type: 'order_refund',
            amount: order.sellingPrice,
            balanceAfter: newBalance,
            description: `Refund for ${order.orderNumber}`,
          },
        })
      }

      return tx.order.findUnique({
        where: { id },
        include: {
          service: { select: { name: true } },
          supplier: { select: { name: true } },
        },
      })
    })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'order.update',
      entityType: 'order',
      entityId: id,
      oldValues: { status: order.status },
      newValues: data,
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({
      ...updated,
      serviceName: updated?.service?.name,
      supplierName: updated?.supplier?.name,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('Orders PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
