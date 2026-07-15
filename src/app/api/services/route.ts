import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { servicesQuerySchema, createServiceSchema, updateServiceSchema, validateBody, validateQuery } from '@/lib/validations'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'

export async function GET(request: Request) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const validation = validateQuery(servicesQuerySchema, searchParams)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { search, type, status, categoryId, limit } = validation.data

    const where: Prisma.ServiceWhereInput = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (type) where.type = type
    if (status) where.status = status
    if (categoryId) where.categoryId = categoryId

    const services = await prisma.service.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        category: { select: { name: true } },
        supplier: { select: { name: true, status: true } },
        customFields: { orderBy: { order: 'asc' } },
        _count: { select: { orders: true } },
      },
    })

    return NextResponse.json({
      services: services.map(s => ({
        ...s,
        categoryName: s.category?.name,
        supplierName: s.supplier?.name,
        supplierStatus: s.supplier?.status,
        orderCount: s._count.orders,
        clientVisible: s.clientVisible,
      })),
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    console.error('Services GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const validation = validateBody(createServiceSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { name, description, type, cost, sellingPrice, processingTime, supplierId, status, clientVisible, categoryId, customFields } = validation.data

    const service = await prisma.$transaction(async (tx) => {
      const s = await tx.service.create({
        data: {
          name,
          description: description || null,
          type,
          cost: cost || 0,
          sellingPrice: sellingPrice || 0,
          processingTime: processingTime || null,
          supplierId: supplierId || null,
          status: status || 'active',
          clientVisible: clientVisible !== false,
          categoryId: categoryId || null,
        },
      })

      if (customFields?.length) {
        await tx.serviceCustomField.createMany({
          data: customFields.map((f: { fieldType: string; label: string; placeholder?: string; options?: unknown; required?: boolean; visibleToClient?: boolean; order?: number }, i: number) => ({
            id: crypto.randomUUID(),
            serviceId: s.id,
            fieldType: f.fieldType,
            label: f.label,
            placeholder: f.placeholder || null,
            options: f.options ? JSON.stringify(f.options) : null,
            required: f.required || false,
            visibleToClient: f.visibleToClient !== false,
            order: f.order ?? i,
          })),
        })
      }

      return tx.service.findUnique({
        where: { id: s.id },
        include: { customFields: { orderBy: { order: 'asc' } } },
      })
    })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'service.create',
      entityType: 'service',
      entityId: service?.id as string,
      newValues: { name, type, cost, sellingPrice },
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json(service, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Services POST error:', error)
    return NextResponse.json({ error: 'Service creation failed' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth()
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const validation = validateBody(updateServiceSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { id, customFields, ...rawUpdates } = validation.data

    const data: Record<string, unknown> = {}
    for (const field of ['name', 'description', 'type', 'cost', 'sellingPrice', 'processingTime', 'status', 'clientVisible', 'categoryId', 'supplierId']) {
      if (field in rawUpdates) data[field] = (rawUpdates as Record<string, unknown>)[field]
    }

    const service = await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.service.update({ where: { id }, data })
      }

      if (customFields !== undefined) {
        await tx.serviceCustomField.deleteMany({ where: { serviceId: id } })
        if (customFields.length) {
          await tx.serviceCustomField.createMany({
            data: customFields.map((f: { fieldType: string; label: string; placeholder?: string; options?: unknown; required?: boolean; visibleToClient?: boolean; order?: number }, i: number) => ({
              id: crypto.randomUUID(),
              serviceId: id,
              fieldType: f.fieldType,
              label: f.label,
              placeholder: f.placeholder || null,
              options: f.options ? JSON.stringify(f.options) : null,
              required: f.required || false,
              visibleToClient: f.visibleToClient !== false,
              order: f.order ?? i,
            })),
          })
        }
      }

      return tx.service.findUnique({
        where: { id },
        include: { customFields: { orderBy: { order: 'asc' } } },
      })
    })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'service.update',
      entityType: 'service',
      entityId: id,
      newValues: data,
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json(service)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Services PATCH error:', error)
    return NextResponse.json({ error: 'Service update failed' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuth()
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    let id = searchParams.get('id') || ''
    if (!id) {
      const body = await request.json().catch(() => ({}))
      id = ((body as Record<string, unknown>).id as string) || ''
    }

    if (!id) return NextResponse.json({ error: 'Service ID is required' }, { status: 400 })

    await prisma.service.delete({ where: { id } })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'service.delete',
      entityType: 'service',
      entityId: id,
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({ message: 'Service deleted successfully' })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Services DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 })
  }
}
