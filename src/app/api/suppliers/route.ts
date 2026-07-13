import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '500')))

    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (status) where.status = status

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { priority: 'asc' },
      take: limit,
      include: {
        _count: { select: { services: true, orders: true } },
      },
    })

    return NextResponse.json({
      suppliers: suppliers.map(s => ({
        ...s,
        serviceCount: s._count.services,
        orderCount: s._count.orders,
      })),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    console.error('Suppliers GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { name, type, email, phone, website, apiKey, priority } = body

    if (!name || !type) return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })

    const supplier = await prisma.supplier.create({
      data: {
        name,
        type,
        email: email || null,
        phone: phone || null,
        website: website || null,
        apiKey: apiKey || null,
        priority: priority || 1,
      },
    })

    return NextResponse.json(supplier, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Suppliers POST error:', error)
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth()
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { id, ...rawUpdates } = body

    if (!id) return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 })

    const data: any = {}
    for (const field of ['name', 'description', 'contact', 'phone', 'email', 'website', 'apiEndpoint', 'apiKey', 'balance', 'status']) {
      if (field in rawUpdates) data[field] = rawUpdates[field]
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const supplier = await prisma.supplier.update({ where: { id }, data })
    return NextResponse.json(supplier)
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Suppliers PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 })
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

    if (!id) return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 })

    const serviceCount = await prisma.service.count({ where: { supplierId: id } })
    if (serviceCount > 0) {
      return NextResponse.json({ error: 'Cannot delete supplier with active services' }, { status: 400 })
    }

    await prisma.supplier.delete({ where: { id } })
    return NextResponse.json({ message: 'Supplier deleted successfully' })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Suppliers DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 })
  }
}
