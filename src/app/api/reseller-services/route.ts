import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'
import { validateBody } from '@/lib/validations'

const resellerServiceUpsertSchema = z.object({
  userId: z.string().min(1, 'Reseller is required'),
  serviceId: z.string().min(1, 'Service is required'),
  price: z.number().min(0).nullable().optional(),
  enabled: z.boolean().optional(),
})

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || undefined
    const status = searchParams.get('status') || undefined

    const serviceWhere: Record<string, unknown> = { clientVisible: true, status: 'active' }
    if (status) serviceWhere.status = status

    const [services, configs] = await Promise.all([
      prisma.service.findMany({
        where: serviceWhere,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          type: true,
          sellingPrice: true,
          cost: true,
          status: true,
        },
      }),
      prisma.resellerService.findMany({
        where: userId ? { userId } : {},
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          service: { select: { id: true, name: true, type: true, sellingPrice: true } },
        },
      }),
    ])

    return NextResponse.json({
      services,
      configs: configs.map((c) => ({
        id: c.id,
        userId: c.userId,
        serviceId: c.serviceId,
        price: c.price,
        enabled: c.enabled,
        updatedAt: c.updatedAt,
        user: c.user,
        service: c.service,
      })),
    })
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('Reseller services GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch reseller services' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin()
    const body = await request.json()
    const validation = validateBody(resellerServiceUpsertSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { userId, serviceId, price, enabled } = validation.data

    const [target, service] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.service.findUnique({ where: { id: serviceId } }),
    ])
    if (!target || target.role !== 'reseller') {
      return NextResponse.json({ error: 'Reseller not found' }, { status: 404 })
    }
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

    const config = await prisma.resellerService.upsert({
      where: { userId_serviceId: { userId, serviceId } },
      update: {
        price: price === null ? null : price,
        enabled: enabled ?? true,
      },
      create: {
        userId,
        serviceId,
        price: price === null ? null : price,
        enabled: enabled ?? true,
      },
    })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'reseller_service.upsert',
      entityType: 'reseller_service',
      entityId: config.id,
      newValues: { userId, serviceId, serviceName: service.name, price: config.price, enabled: config.enabled },
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({ config })
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('Reseller services POST error:', error)
    return NextResponse.json({ error: 'Failed to save reseller service' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAdmin()
    const body = await request.json()
    const validation = validateBody(z.object({
      userId: z.string().min(1),
      serviceId: z.string().min(1),
    }), body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { userId, serviceId } = validation.data

    await prisma.resellerService.deleteMany({ where: { userId, serviceId } })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'reseller_service.delete',
      entityType: 'reseller_service',
      newValues: { userId, serviceId },
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('Reseller services DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete reseller service' }, { status: 500 })
  }
}