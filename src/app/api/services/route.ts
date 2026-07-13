import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || ''
    const status = searchParams.get('status') || ''
    const categoryId = searchParams.get('categoryId') || ''
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '500')))

    const where: any = {}
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
      })),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    console.error('Services GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { name, description, type, cost, sellingPrice, processingTime, supplierId, status, categoryId, customFields } = body

    if (!name || !type) return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })

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
          categoryId: categoryId || null,
        },
      })

      if (customFields?.length) {
        await tx.serviceCustomField.createMany({
          data: customFields.map((f: any, i: number) => ({
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

    return NextResponse.json(service, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Services POST error:', error)
    return NextResponse.json({ error: 'Service creation failed' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth()
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { id, customFields, ...rawUpdates } = body

    if (!id) return NextResponse.json({ error: 'Service ID is required' }, { status: 400 })

    const data: any = {}
    for (const field of ['name', 'description', 'type', 'cost', 'sellingPrice', 'processingTime', 'status', 'categoryId', 'supplierId']) {
      if (field in rawUpdates) data[field] = rawUpdates[field]
    }

    const service = await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.service.update({ where: { id }, data })
      }

      if (customFields !== undefined) {
        await tx.serviceCustomField.deleteMany({ where: { serviceId: id } })
        if (customFields.length) {
          await tx.serviceCustomField.createMany({
            data: customFields.map((f: any, i: number) => ({
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

    return NextResponse.json(service)
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
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
      id = (body as any).id || ''
    }

    if (!id) return NextResponse.json({ error: 'Service ID is required' }, { status: 400 })

    await prisma.service.delete({ where: { id } })
    return NextResponse.json({ message: 'Service deleted successfully' })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Services DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 })
  }
}
