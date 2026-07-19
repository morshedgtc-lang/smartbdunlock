import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { encryptApiKey } from '@/lib/crypto'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()
    const { id } = await params

    const provider = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: { select: { supplierServices: true, syncHistories: true } },
        syncHistories: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    })

    if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

    return NextResponse.json({
      id: provider.id,
      name: provider.name,
      email: provider.email,
      phone: provider.phone,
      website: provider.website,
      type: provider.type,
      status: provider.status,
      successRate: provider.successRate,
      totalOrders: provider.totalOrders,
      priority: provider.priority,
      ipAddress: provider.ipAddress,
      syncInterval: provider.syncInterval,
      lastSyncAt: provider.lastSyncAt,
      config: provider.config,
      apiKey: (provider.apiKeyEncrypted || provider.apiKey) ? '••••••••' : null,
      supplierServiceCount: provider._count.supplierServices,
      syncCount: provider._count.syncHistories,
      recentSyncs: provider.syncHistories,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    console.error('Provider GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch provider' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const body = await request.json()

    const data: Record<string, unknown> = {}
    for (const field of ['name', 'email', 'phone', 'website', 'priority', 'status', 'syncInterval', 'ipAddress', 'config']) {
      if (field in body) data[field] = body[field]
    }
    if (body.apiKey && body.apiKey !== '••••••••') {
      data.apiKeyEncrypted = encryptApiKey(body.apiKey)
      data.apiKey = null
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const provider = await prisma.supplier.update({ where: { id }, data })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'provider.update',
      entityType: 'supplier',
      entityId: id,
      newValues: { ...data, apiKeyEncrypted: data.apiKeyEncrypted ? '••••••••' : undefined },
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({ ...provider, apiKeyEncrypted: '••••••••' })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Provider PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update provider' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    const serviceCount = await prisma.supplierService.count({ where: { providerId: id } })
    if (serviceCount > 0) {
      return NextResponse.json({ error: 'Cannot delete provider with imported services. Remove services first.' }, { status: 400 })
    }

    await prisma.supplier.delete({ where: { id } })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'provider.delete',
      entityType: 'supplier',
      entityId: id,
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({ message: 'Provider deleted' })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Provider DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete provider' }, { status: 500 })
  }
}
