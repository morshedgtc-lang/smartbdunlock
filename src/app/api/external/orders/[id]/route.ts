import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateApiKey } from '@/lib/api-key-auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateApiKey(request)
    if ('error' in auth) return auth.error

    if (auth.user.permissions !== 'read' && auth.user.permissions !== 'write' && auth.user.permissions !== 'admin') {
      return NextResponse.json({ error: 'Read permission required' }, { status: 403 })
    }

    const { id } = await params

    const order = await prisma.order.findFirst({
      where: {
        id,
        userId: auth.user.userId,
      },
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
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      imei: order.imei,
      deviceInfo: order.deviceInfo,
      notes: order.notes,
      result: order.result,
      cost: order.cost,
      sellingPrice: order.sellingPrice,
      profit: order.profit,
      completedAt: order.completedAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      serviceName: order.service?.name,
      serviceType: order.service?.type,
      customValues: order.customValues
        .filter(cv => cv.customField?.visibleToClient !== false)
        .map(cv => ({
          label: cv.customField?.label,
          fieldType: cv.customField?.fieldType,
          value: cv.value,
        })),
    })
  } catch (error: unknown) {
    console.error('External Order detail GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}
