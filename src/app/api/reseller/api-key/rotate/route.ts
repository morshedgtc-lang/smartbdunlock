import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'
import { encryptApiKey } from '@/lib/crypto'
import { generateApiKey, hashApiKey, keyPrefixFor } from '@/lib/api-key'
import { csrfOk, csrfError } from '@/lib/csrf'

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    if (!(await csrfOk(request))) {
      return NextResponse.json(csrfError(), { status: 403 })
    }

    const { keyId } = (await request.json()) as { keyId?: string }
    if (!keyId) {
      return NextResponse.json({ error: 'API key ID is required' }, { status: 400 })
    }

    const apiKey = await prisma.apiKey.findFirst({
      where: { id: keyId, userId: user.id },
      select: { id: true, name: true, status: true },
    })
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }
    if (apiKey.status !== 'active') {
      return NextResponse.json({ error: 'Only active API keys can be rotated' }, { status: 403 })
    }

    const plainKey = generateApiKey()
    const keyHash = hashApiKey(plainKey)
    const keyPrefix = keyPrefixFor(plainKey)
    const keyEncrypted = encryptApiKey(plainKey)

    const updated = await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { keyHash, keyPrefix, keyEncrypted, totalRequests: 0, requestsInWindow: 0, windowStartedAt: null },
      select: { id: true, name: true, status: true, keyPrefix: true },
    })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'api_key.rotate',
      entityType: 'api_key',
      entityId: apiKey.id,
      newValues: { keyName: apiKey.name, keyPrefix },
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({ ...updated, key: plainKey })
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('Reseller API key rotate error:', error)
    return NextResponse.json({ error: 'Failed to rotate API key' }, { status: 500 })
  }
}