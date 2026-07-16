import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { authenticateApiKey } from '@/lib/api-key-auth'
import { createOrderSchema, validateBody } from '@/lib/validations'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'
import { createOrderNotification, createWalletNotification } from '@/lib/notifications'

export async function GET(request: Request) {
  try {
    const auth = await authenticateApiKey(request)
    if ('error' in auth) return auth.error

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit

    const where: Prisma.OrderWhereInput = { userId: auth.user.userId }
    if (status) where.status = status

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          service: { select: { name: true, type: true } },
          customValues: {
            include: {
              customField: {
                select: { label: true, fieldType: true, visibleToClient: true },
              },
            },
          },
        },
      }),
    ])

    return NextResponse.json({
      orders: orders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        imei: o.imei,
        deviceInfo: o.deviceInfo,
        notes: o.notes,
        sellingPrice: o.sellingPrice,
        completedAt: o.completedAt,
        createdAt: o.createdAt,
        serviceName: o.service?.name,
        serviceType: o.service?.type,
        customValues: o.customValues
          .filter(cv => cv.customField?.visibleToClient !== false)
          .map(cv => ({
            label: cv.customField?.label,
            fieldType: cv.customField?.fieldType,
            value: cv.value,
          })),
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error: unknown) {
    console.error('External Orders GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authenticateApiKey(request)
    if ('error' in auth) return auth.error

    if (auth.user.permissions !== 'write' && auth.user.permissions !== 'admin') {
      return NextResponse.json({ error: 'Write permission required' }, { status: 403 })
    }

    const body = await request.json()
    const validation = validateBody(createOrderSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { serviceId, imei, deviceInfo, notes, customFieldValues } = validation.data

    const service = await prisma.service.findUnique({ where: { id: serviceId } })
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    if (service.status !== 'active') return NextResponse.json({ error: 'Service is not available' }, { status: 400 })

    const userId = auth.user.userId
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
          const userBefore = await tx.user.findUnique({ where: { id: userId } })
          if (!userBefore || userBefore.walletBalance < service.sellingPrice) {
            throw new Error('Insufficient balance')
          }

          const newBalance = userBefore.walletBalance - service.sellingPrice
          await tx.user.update({ where: { id: userId }, data: { walletBalance: newBalance } })

          await tx.transaction.create({
            data: {
              id: crypto.randomUUID(),
              userId,
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
              userId,
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

          await createWalletNotification(userId, 'order_payment', service.sellingPrice, `Payment for ${service.name}`)

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
      } catch (txError: unknown) {
        if (txError instanceof Error && 'code' in txError && txError.code === 'P2002' && attempt < MAX_RETRIES - 1) continue
        throw txError
      }
    }

    const orderResult = result as Record<string, unknown> | null
    await auditLog({
      userId,
      action: 'order.create',
      entityType: 'order',
      entityId: orderResult?.id as string | undefined,
      newValues: { serviceId, imei, orderNumber: orderResult?.orderNumber, source: 'external_api' },
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    await createOrderNotification({
      id: orderResult?.id as string,
      orderNumber: orderResult?.orderNumber as string,
      status: 'pending',
      serviceName: service.name,
      userId,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: unknown) {
    console.error('External Orders POST error:', error)
    if (error instanceof Error && error.message === 'Insufficient balance') return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
    return NextResponse.json({ error: 'Order creation failed' }, { status: 500 })
  }
}
