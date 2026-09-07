import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'
import { encryptApiKey } from '@/lib/crypto'
import { generateApiKey, hashApiKey, keyPrefixFor } from '@/lib/api-key'

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

    const ownerIds = [...new Set(apiKeys.map(k => k.userId))]
    const owners = ownerIds.length
      ? await prisma.user.findMany({
          where: { id: { in: ownerIds } },
          select: { id: true, userId: true, email: true, name: true, role: true },
        })
      : []
    const ownerMap = new Map(owners.map(o => [o.id, o]))

    return NextResponse.json({
      apiKeys: apiKeys.map(k => ({ ...k, owner: ownerMap.get(k.userId) ?? null })),
    })
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
    const { name, permissions, requestLimit, expiresAt, userId: ownerId } = body as {
      name?: string
      permissions?: string
      requestLimit?: number
      expiresAt?: string
      userId?: string
    }

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    let ownerUserId = admin.id
    if (ownerId) {
      const owner = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { id: true, role: true, status: true },
      })
      if (!owner) {
        return NextResponse.json({ error: 'Reseller not found' }, { status: 404 })
      }
      if (owner.role !== 'reseller') {
        return NextResponse.json({ error: 'Key owner must be a reseller' }, { status: 400 })
      }
      if (owner.status !== 'active') {
        return NextResponse.json({ error: 'Reseller account is not active' }, { status: 400 })
      }
      ownerUserId = owner.id
    }

    const plainKey = generateApiKey()
    const keyHash = hashApiKey(plainKey)
    const keyPrefix = keyPrefixFor(plainKey)
    const keyEncrypted = encryptApiKey(plainKey)

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        keyHash,
        keyPrefix,
        keyEncrypted,
        userId: ownerUserId,
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
      newValues: { name, permissions: apiKey.permissions, requestLimit: apiKey.requestLimit, ownerUserId },
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

      const plainKey = generateApiKey()
      const keyHash = hashApiKey(plainKey)
      const keyPrefix = keyPrefixFor(plainKey)
      const keyEncrypted = encryptApiKey(plainKey)

      const before = await prisma.apiKey.findUnique({ where: { id }, select: { name: true, keyPrefix: true } })
      const apiKey = await prisma.apiKey.update({
        where: { id },
        data: { keyHash, keyPrefix, keyEncrypted, totalRequests: 0 },
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
