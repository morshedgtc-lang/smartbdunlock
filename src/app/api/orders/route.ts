import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { applyBalance } from '@/lib/wallet'
import { Prisma } from '@prisma/client'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10') || 10))
    const skip = (page - 1) * limit

    const where: any = {}

    if (session.user.role === 'admin') {
      // Admin sees all orders
    } else {
      where.userId = session.user.id
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { imei: { contains: search } },
        { deviceInfo: { contains: search } },
      ]
    }

    if (status) {
      where.status = status
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          service: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          customValues: {
            include: {
              customField: {
                select: {
                  id: true,
                  label: true,
                  fieldType: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ])

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Orders fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { serviceId, imei, deviceInfo, notes, customFieldValues } = body

    if (!serviceId) {
      return NextResponse.json(
        { error: 'Service ID is required' },
        { status: 400 }
      )
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        supplier: true,
        customFields: true,
      },
    })

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    if (service.status !== 'active') {
      return NextResponse.json({ error: 'Service is not available' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (service.customFields.length > 0 && customFieldValues) {
      for (const field of service.customFields) {
        if (field.required) {
          const value = customFieldValues[field.id]
          if (!value || (typeof value === 'string' && !value.trim())) {
            return NextResponse.json(
              { error: `Field "${field.label}" is required` },
              { status: 400 }
            )
          }
        }
      }
    }

    if (service.customFields.length > 0 && customFieldValues) {
      for (const field of service.customFields) {
        const value = customFieldValues[field.id]
        if (!value) continue

        if (field.fieldType === 'imei_single') {
          const cleaned = String(value).replace(/\D/g, '')
          if (cleaned.length !== 15) {
            return NextResponse.json(
              { error: `IMEI must be exactly 15 digits` },
              { status: 400 }
            )
          }
        }

        if (field.fieldType === 'imei_multi') {
          const lines = String(value).split('\n').map((l: string) => l.replace(/\D/g, '').trim()).filter(Boolean)
          const invalid = lines.find((l: string) => l.length !== 15)
          if (invalid) {
            return NextResponse.json(
              { error: `IMEI "${invalid}" must be exactly 15 digits` },
              { status: 400 }
            )
          }
        }
      }
    }

    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`

    // Retry loop: orderNumber is derived from a daily count, so two concurrent
    // orders can collide on the @unique constraint. Regenerate and retry.
    let result: import('@prisma/client').Order | null = null
    for (let attempt = 0; attempt < 10; attempt++) {
      const orderCount = await prisma.order.count({ where: { createdAt: { gte: startOfDay } } })
      const orderNumber = `ORD-${dateStr}-${String(orderCount + 1).padStart(4, '0')}`

      try {
        result = await prisma.$transaction(async (tx) => {
          // Atomic debit — throws INSUFFICIENT_BALANCE if balance too low.
          await applyBalance(tx, session.user.id, -service.sellingPrice, {
            type: 'order_payment',
            description: `Payment for ${service.name}`,
          })

          const order = await tx.order.create({
            data: {
              orderNumber,
              userId: session.user.id,
              serviceId,
              supplierId: service.supplierId,
              imei,
              deviceInfo,
              notes,
              cost: service.cost,
              sellingPrice: service.sellingPrice,
              profit: service.sellingPrice - service.cost,
              status: 'pending',
            },
          })

          if (customFieldValues && service.customFields.length > 0) {
            const valuesData: { orderId: string; customFieldId: string; value: string }[] = []

            for (const field of service.customFields) {
              const rawValue = customFieldValues[field.id]
              if (rawValue === undefined || rawValue === null) continue

              let value = String(rawValue)

              if (field.fieldType === 'imei_multi') {
                const uniqueImeis = [...new Set(
                  value.split('\n').map((l: string) => l.replace(/\D/g, '').trim()).filter(Boolean)
                )]
                value = JSON.stringify(uniqueImeis)
              } else if (field.fieldType === 'serial_multi') {
                const uniqueSerials = [...new Set(
                  value.split('\n').map((l: string) => l.trim()).filter(Boolean)
                )]
                value = JSON.stringify(uniqueSerials)
              } else if (field.fieldType === 'multiselect') {
                if (Array.isArray(rawValue)) {
                  value = JSON.stringify(rawValue)
                }
              }

              valuesData.push({
                orderId: order.id,
                customFieldId: field.id,
                value,
              })
            }

            if (valuesData.length > 0) {
              await tx.orderCustomFieldValue.createMany({ data: valuesData })
            }
          }

          return order
        })
        break
      } catch (e: unknown) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002' &&
          Array.isArray(e.meta?.target) &&
          (e.meta?.target as string[]).includes('orderNumber')
        ) {
          continue // unique collision — regenerate orderNumber and retry
        }
        throw e
      }
    }

    if (!result) {
      return NextResponse.json(
        { error: 'Could not reserve an order number, please retry' },
        { status: 409 }
      )
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    console.error('Order create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { id, status, notes, result } = body

    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { id },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (session.user.role !== 'admin' && order.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: status || order.status,
        notes: notes || order.notes,
        result: result || order.result,
        completedAt: status === 'completed' ? new Date() : order.completedAt,
      },
      include: {
        service: true,
        supplier: true,
        customValues: {
          include: {
            customField: true,
          },
        },
      },
    })

    const prevStatus = order.status
    const newStatus = status || prevStatus

    // Increment supplier totalOrders only when transitioning INTO completed
    if (newStatus === 'completed' && prevStatus !== 'completed' && order.supplierId) {
      await prisma.supplier.update({
        where: { id: order.supplierId },
        data: { totalOrders: { increment: 1 } },
      })
    }

    // Refund the customer when an order fails or is cancelled, but only when
    // transitioning out of a paid state (and never if already refunded).
    if (
      (newStatus === 'failed' || newStatus === 'cancelled') &&
      (prevStatus === 'pending' || prevStatus === 'processing')
    ) {
      await prisma.$transaction(async (tx) => {
        await applyBalance(tx, order.userId, order.sellingPrice, {
          type: 'order_refund',
          description: `Refund for ${order.orderNumber}`,
          orderId: order.id,
        })
      })
    }

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Order update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
