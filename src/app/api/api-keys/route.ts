import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'

async function hashKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function generateKey(): string {
  const raw = crypto.randomUUID().replace(/-/g, '')
  const hex = crypto.getRandomValues(new Uint8Array(16)).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '')
  return `sbdu_${raw}${hex}`
}

export async function GET() {
  try {
    await requireAdmin()
    const apiKeys = await prisma.apiKey.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        userId: true,
        status: true,
        permissions: true,
        requestLimit: true,
        totalRequests: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    })
    return NextResponse.json({ apiKeys })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('API Keys GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const body = await request.json()
    const { name, permissions, requestLimit, expiresAt } = body as {
      name?: string
      permissions?: string
      requestLimit?: number
      expiresAt?: string
    }

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const plainKey = generateKey()
    const keyHash = await hashKey(plainKey)
    const keyPrefix = `sbdu_${plainKey.slice(5, 9)}****`

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        keyHash,
        keyPrefix,
        userId: admin.id,
        permissions: permissions || 'read',
        requestLimit: requestLimit || 100,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        status: true,
        permissions: true,
        requestLimit: true,
        createdAt: true,
      },
    })

    await auditLog({
      userId: admin.id,
      userEmail: admin.email,
      action: 'api_key.create',
      entityType: 'api_key',
      entityId: apiKey.id,
      newValues: { name, permissions: apiKey.permissions, requestLimit: apiKey.requestLimit },
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({ ...apiKey, key: plainKey }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('API Keys POST error:', error)
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin()
    const body = await request.json()
    const { id, action, name, status, permissions, requestLimit, expiresAt } = body as {
      id?: string
      action?: string
      name?: string
      status?: string
      permissions?: string
      requestLimit?: number
      expiresAt?: string | null
    }

    if (!id) {
      return NextResponse.json({ error: 'API key ID is required' }, { status: 400 })
    }

    if (action === 'regenerate') {
      const existing = await prisma.apiKey.findUnique({ where: { id }, select: { id: true, status: true } })
      if (!existing) return NextResponse.json({ error: 'API key not found' }, { status: 404 })
      if (existing.status !== 'active') return NextResponse.json({ error: 'Can only regenerate active keys' }, { status: 400 })

      const plainKey = generateKey()
      const keyHash = await hashKey(plainKey)
      const keyPrefix = `sbdu_${plainKey.slice(5, 9)}****`

      const before = await prisma.apiKey.findUnique({ where: { id }, select: { name: true, keyPrefix: true } })
      const apiKey = await prisma.apiKey.update({
        where: { id },
        data: { keyHash, keyPrefix, totalRequests: 0 },
      })

      await auditLog({
        userId: admin.id,
        userEmail: admin.email,
        action: 'api_key.regenerate',
        entityType: 'api_key',
        entityId: id,
        oldValues: before || {},
        newValues: { keyPrefix },
        ip: getClientIp(request),
        userAgent: getClientUserAgent(request),
      })

      return NextResponse.json({ ...apiKey, key: plainKey })
    }

    const data: Record<string, unknown> = {}
    if (name) data.name = name
    if (status) data.status = status
    if (permissions) data.permissions = permissions
    if (requestLimit !== undefined) data.requestLimit = requestLimit
    if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const before = await prisma.apiKey.findUnique({ where: { id }, select: { name: true, status: true, permissions: true, requestLimit: true } })
    const apiKey = await prisma.apiKey.update({ where: { id }, data })

    await auditLog({
      userId: admin.id,
      userEmail: admin.email,
      action: 'api_key.update',
      entityType: 'api_key',
      entityId: id,
      oldValues: before || {},
      newValues: data,
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json(apiKey)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('API Keys PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin()
    const body = await request.json()
    const { id } = body as { id?: string }

    if (!id) {
      return NextResponse.json({ error: 'API key ID is required' }, { status: 400 })
    }

    const before = await prisma.apiKey.findUnique({ where: { id }, select: { name: true, status: true } })
    const apiKey = await prisma.apiKey.update({ where: { id }, data: { status: 'revoked' } })

    await auditLog({
      userId: admin.id,
      userEmail: admin.email,
      action: 'api_key.revoke',
      entityType: 'api_key',
      entityId: id,
      oldValues: before || {},
      newValues: { status: 'revoked' },
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json(apiKey)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('API Keys DELETE error:', error)
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 })
  }
}
