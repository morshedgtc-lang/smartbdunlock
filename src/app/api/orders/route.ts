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

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
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

    if (user.walletBalance < service.sellingPrice) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      )
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
          const cleaned = value.replace(/\D/g, '')
          if (cleaned.length !== 15) {
            return NextResponse.json(
              { error: `IMEI must be exactly 15 digits` },
              { status: 400 }
            )
          }
        }

        if (field.fieldType === 'imei_multi') {
          const lines = value.split('\n').map((l: string) => l.replace(/\D/g, '').trim()).filter(Boolean)
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
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
    const orderCount = await prisma.order.count({
      where: { createdAt: { gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) } },
    })
    const orderNumber = `ORD-${dateStr}-${String(orderCount + 1).padStart(4, '0')}`

    const result = await prisma.$transaction(async (tx) => {
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

      await tx.transaction.create({
        data: {
          userId: session.user.id,
          orderId: order.id,
          type: 'order_payment',
          amount: -service.sellingPrice,
          balanceAfter: user.walletBalance - service.sellingPrice,
          description: `Payment for ${service.name}`,
        },
      })

      await tx.user.update({
        where: { id: session.user.id },
        data: { walletBalance: user.walletBalance - service.sellingPrice },
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

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
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

    if (status === 'completed' && order.supplierId) {
      await prisma.supplier.update({
        where: { id: order.supplierId },
        data: {
          totalOrders: { increment: 1 },
        },
      })
    }

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Order update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
