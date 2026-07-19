import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { supplierServiceQuerySchema, bulkServiceActionSchema, validateBody, validateQuery } from '@/lib/validations'

export async function GET(request: Request) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const validation = validateQuery(supplierServiceQuerySchema, searchParams)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { providerId, status, search, category, page, limit } = validation.data

    const where: Record<string, unknown> = {}
    if (providerId) where.providerId = providerId
    if (status) where.status = status
    if (category) where.category = category
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { supplierServiceId: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [services, total] = await Promise.all([
      prisma.supplierService.findMany({
        where,
        include: { provider: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.supplierService.count({ where }),
    ])

    return NextResponse.json({ services, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    console.error('Supplier services GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch supplier services' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { requireAdmin } = await import('@/lib/auth')
    await requireAdmin()

    const body = await request.json()
    const validation = validateBody(bulkServiceActionSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { ids, action } = validation.data

    const statusMap: Record<string, string> = {
      approve: 'approved',
      ignore: 'ignored',
      disable: 'disabled',
    }

    await prisma.supplierService.updateMany({
      where: { id: { in: ids } },
      data: { status: statusMap[action] },
    })

    return NextResponse.json({ message: `${ids.length} services ${action}d`, updated: ids.length })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Supplier services POST error:', error)
    return NextResponse.json({ error: 'Failed to update services' }, { status: 500 })
  }
}
