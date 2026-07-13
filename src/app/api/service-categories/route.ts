import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '200')))

    const categories = await prisma.serviceCategory.findMany({
      orderBy: { name: 'asc' },
      take: limit,
      include: { _count: { select: { services: true } } },
    })

    return NextResponse.json({
      categories: categories.map(c => ({
        ...c,
        serviceCount: c._count.services,
      })),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    console.error('Categories GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const name = (body.name || '').trim()

    if (!name) return NextResponse.json({ error: 'Category name is required' }, { status: 400 })

    const existing = await prisma.serviceCategory.findFirst({ where: { name } })
    if (existing) return NextResponse.json({ error: 'Category already exists' }, { status: 409 })

    const category = await prisma.serviceCategory.create({ data: { name } })
    return NextResponse.json(category, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Categories POST error:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth()
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { id, name: rawName } = body
    const name = (rawName || '').trim()

    if (!id) return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    if (!name) return NextResponse.json({ error: 'Category name is required' }, { status: 400 })

    const existing = await prisma.serviceCategory.findFirst({ where: { name, NOT: { id } } })
    if (existing) return NextResponse.json({ error: 'Category name already exists' }, { status: 409 })

    const category = await prisma.serviceCategory.update({ where: { id }, data: { name } })
    return NextResponse.json(category)
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Categories PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuth()
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id') || ''

    if (!id) return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })

    const count = await prisma.service.count({ where: { categoryId: id } })
    if (count > 0) {
      return NextResponse.json({ error: `Cannot delete category with ${count} service(s). Reassign or remove them first.` }, { status: 400 })
    }

    await prisma.serviceCategory.delete({ where: { id } })
    return NextResponse.json({ message: 'Category deleted successfully' })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Categories DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
