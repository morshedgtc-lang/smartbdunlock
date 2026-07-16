import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { authenticateApiKey } from '@/lib/api-key-auth'

export async function GET(request: Request) {
  try {
    const auth = await authenticateApiKey(request)
    if ('error' in auth) return auth.error

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || undefined
    const type = searchParams.get('type') || undefined
    const categoryId = searchParams.get('categoryId') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    const where: Prisma.ServiceWhereInput = {
      clientVisible: true,
      status: 'active',
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (type) where.type = type
    if (categoryId) where.categoryId = categoryId

    const services = await prisma.service.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        category: { select: { name: true } },
        customFields: {
          where: { visibleToClient: true },
          orderBy: { order: 'asc' },
        },
      },
    })

    return NextResponse.json({
      services: services.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        type: s.type,
        sellingPrice: s.sellingPrice,
        processingTime: s.processingTime,
        status: s.status,
        categoryName: s.category?.name,
        customFields: s.customFields.map(f => ({
          id: f.id,
          fieldType: f.fieldType,
          label: f.label,
          placeholder: f.placeholder,
          options: f.options,
          required: f.required,
        })),
      })),
    })
  } catch (error: unknown) {
    console.error('External Services GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
  }
}
