import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { suppliersQuerySchema, createSupplierSchema, updateSupplierSchema, validateBody, validateQuery } from '@/lib/validations'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'

export async function GET(request: Request) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const validation = validateQuery(suppliersQuerySchema, searchParams)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { search, status, limit } = validation.data

    const where: Prisma.SupplierWhereInput = {}
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
        apiKey: s.apiKey ? '••••••••' : null,
        config: s.config || null,
        serviceCount: s._count.services,
        orderCount: s._count.orders,
      })),
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    console.error('Suppliers GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()

    if (body.action === 'test' && body.id) {
      const supplier = await prisma.supplier.findUnique({ where: { id: body.id } })
      if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })

      const result: { websiteReachable?: boolean; websiteMs?: number; websiteError?: string; hasApiKey: boolean; apiMessage?: string } = {
        hasApiKey: !!supplier.apiKey,
      }

      if (supplier.website) {
        try {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 5000)
          const start = Date.now()
          const res = await fetch(supplier.website, { signal: controller.signal, method: 'HEAD' })
          clearTimeout(timeout)
          result.websiteReachable = res.ok
          result.websiteMs = Date.now() - start
        } catch (err: unknown) {
          result.websiteReachable = false
          result.websiteError = err instanceof Error ? err.message : 'Connection failed'
        }
      }

      if (supplier.apiKey) {
        result.apiMessage = 'API key configured — external API testing not supported'
      }

      await auditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'supplier.test',
        entityType: 'supplier',
        entityId: supplier.id,
        newValues: { result },
        ip: getClientIp(request),
        userAgent: getClientUserAgent(request),
      })

      return NextResponse.json({ success: true, result })
    }

    const validation = validateBody(createSupplierSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { name, type, email, phone, website, apiKey, config, priority } = validation.data

    const supplier = await prisma.supplier.create({
      data: {
        name,
        type,
        email: email || null,
        phone: phone || null,
        website: website || null,
        apiKey: apiKey || null,
        config: config || null,
        priority: priority || 1,
      },
    })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'supplier.create',
      entityType: 'supplier',
      entityId: supplier.id,
      newValues: { name, type },
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({ ...supplier, apiKey: supplier.apiKey ? '••••••••' : null }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Suppliers POST error:', error)
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth()
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const validation = validateBody(updateSupplierSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { id, ...rawUpdates } = validation.data

    const data: Record<string, unknown> = {}
    for (const field of ['name', 'type', 'email', 'phone', 'website', 'apiKey', 'config', 'priority', 'status']) {
      if (field in rawUpdates) data[field] = (rawUpdates as Record<string, unknown>)[field]
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const supplier = await prisma.supplier.update({ where: { id }, data })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'supplier.update',
      entityType: 'supplier',
      entityId: id,
      newValues: data,
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({ ...supplier, apiKey: supplier.apiKey ? '••••••••' : null })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
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
      id = ((body as Record<string, unknown>).id as string) || ''
    }

    if (!id) return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 })

    const serviceCount = await prisma.service.count({ where: { supplierId: id } })
    if (serviceCount > 0) {
      return NextResponse.json({ error: 'Cannot delete supplier with active services' }, { status: 400 })
    }

    await prisma.supplier.delete({ where: { id } })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'supplier.delete',
      entityType: 'supplier',
      entityId: id,
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({ message: 'Supplier deleted successfully' })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Suppliers DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 })
  }
}
