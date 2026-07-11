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

    const categories = await prisma.serviceCategory.findMany({
      include: { _count: { select: { services: true } } },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Categories fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { name } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    const existing = await prisma.serviceCategory.findFirst({ where: { name: name.trim() } })
    if (existing) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 409 })
    }

    const category = await prisma.serviceCategory.create({
      data: { name: name.trim() },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Category create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { id, name } = body

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    const existing = await prisma.serviceCategory.findFirst({
      where: { name: name.trim(), NOT: { id } },
    })
    if (existing) {
      return NextResponse.json({ error: 'Category name already exists' }, { status: 409 })
    }

    const category = await prisma.serviceCategory.update({
      where: { id },
      data: { name: name.trim() },
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Category update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    const category = await prisma.serviceCategory.findUnique({
      where: { id },
      include: { _count: { select: { services: true } } },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    if (category._count.services > 0) {
      return NextResponse.json(
        { error: `Cannot delete category with ${category._count.services} service(s). Reassign or remove them first.` },
        { status: 400 }
      )
    }

    await prisma.serviceCategory.delete({ where: { id } })

    return NextResponse.json({ message: 'Category deleted successfully' })
  } catch (error) {
    console.error('Category delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
