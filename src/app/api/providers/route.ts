import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { encryptApiKey } from '@/lib/crypto'
import { providerQuerySchema, createProviderSchema, validateBody, validateQuery } from '@/lib/validations'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'

export async function GET(request: Request) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const validation = validateQuery(providerQuerySchema, searchParams)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { search, status, limit } = validation.data

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (status) where.status = status

    const providers = await prisma.supplier.findMany({
      where,
      orderBy: { priority: 'asc' },
      take: limit,
      include: {
        _count: { select: { services: true, orders: true, supplierServices: true, syncHistories: true } },
        supplierServices: { where: { status: 'pending' }, select: { id: true } },
        syncHistories: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true, status: true, totalImported: true } },
      },
    })

    return NextResponse.json({
      providers: providers.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        website: s.website,
        type: s.type,
        status: s.status,
        successRate: s.successRate,
        totalOrders: s.totalOrders,
        priority: s.priority,
        ipAddress: s.ipAddress,
        syncInterval: s.syncInterval,
        lastSyncAt: s.lastSyncAt,
        apiKey: s.apiKeyEncrypted || s.apiKey ? '••••••••' : null,
        serviceCount: s._count.services,
        orderCount: s._count.orders,
        supplierServiceCount: s._count.supplierServices,
        pendingCount: s.supplierServices.length,
        lastSync: s.syncHistories[0] || null,
        createdAt: s.createdAt,
      })),
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    console.error('Providers GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const validation = validateBody(createProviderSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { name, apiKey, ipAddress, website, email, phone, syncInterval, config, priority, apiUrl } = validation.data

    const encryptedKey = encryptApiKey(apiKey)

    const providerConfig = config
      ? config
      : apiUrl
        ? JSON.stringify({ apiUrl })
        : null

    const provider = await prisma.supplier.create({
      data: {
        name,
        type: 'api',
        apiKeyEncrypted: encryptedKey,
        apiKey: null,
        ipAddress: ipAddress || null,
        website: website || null,
        email: email || null,
        phone: phone || null,
        syncInterval: syncInterval || 10,
        config: providerConfig,
        priority: priority || 1,
        status: 'active',
      },
    })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'provider.create',
      entityType: 'supplier',
      entityId: provider.id,
      newValues: { name, type: 'api' },
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({ ...provider, apiKeyEncrypted: '••••••••', apiKey: null }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Providers POST error:', error)
    return NextResponse.json({ error: 'Failed to create provider' }, { status: 500 })
  }
}
