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
    const type = searchParams.get('type') || ''
    const status = searchParams.get('status') || ''
    const categoryId = searchParams.get('categoryId') || ''
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '500') || 500))

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ]
    }

    if (type) {
      where.type = type
    }

    if (status) {
      where.status = status
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    const services = await prisma.service.findMany({
      where,
      include: {
        category: true,
        supplier: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        customFields: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ services })
  } catch (error) {
    console.error('Services fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { name, description, type, cost, sellingPrice, processingTime, supplierId, status, categoryId, customFields } = body

    if (!name || !type || cost === undefined || sellingPrice === undefined) {
      return NextResponse.json(
        { error: 'Name, type, cost, and selling price are required' },
        { status: 400 }
      )
    }

    const service = await prisma.$transaction(async (tx) => {
      const newService = await tx.service.create({
        data: {
          name,
          description,
          type,
          cost,
          sellingPrice,
          processingTime,
          supplierId: supplierId || undefined,
          status: status || 'active',
          categoryId: categoryId || undefined,
        },
      })

      if (customFields && Array.isArray(customFields) && customFields.length > 0) {
        await tx.serviceCustomField.createMany({
          data: customFields.map((field: any, index: number) => ({
            serviceId: newService.id,
            fieldType: field.fieldType,
            label: field.label,
            placeholder: field.placeholder || null,
            options: field.options ? JSON.stringify(field.options) : null,
            required: field.required || false,
            visibleToClient: field.visibleToClient !== false,
            order: field.order ?? index,
          })),
        })
      }

      return newService
    })

    const result = await prisma.service.findUnique({
      where: { id: service.id },
      include: { category: true, customFields: { orderBy: { order: 'asc' } } },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Service create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { id, customFields, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 })
    }

    const service = await prisma.$transaction(async (tx) => {
      const updated = await tx.service.update({
        where: { id },
        data,
      })

      if (customFields && Array.isArray(customFields)) {
        await tx.serviceCustomField.deleteMany({ where: { serviceId: id } })

        if (customFields.length > 0) {
          await tx.serviceCustomField.createMany({
            data: customFields.map((field: any, index: number) => ({
              serviceId: id,
              fieldType: field.fieldType,
              label: field.label,
              placeholder: field.placeholder || null,
              options: field.options ? JSON.stringify(field.options) : null,
              required: field.required || false,
              visibleToClient: field.visibleToClient !== false,
              order: field.order ?? index,
            })),
          })
        }
      }

      return updated
    })

    const result = await prisma.service.findUnique({
      where: { id: service.id },
      include: { category: true, customFields: { orderBy: { order: 'asc' } } },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Service update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 })
    }

    await prisma.service.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Service deleted successfully' })
  } catch (error) {
    console.error('Service delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
