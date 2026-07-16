import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'

interface ApiKeyUser {
  keyId: string
  userId: string
  permissions: string
  name: string
}

async function sha256hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function authenticateApiKey(
  request: Request,
): Promise<{ user: ApiKeyUser } | { error: NextResponse }> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      error: NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 },
      ),
    }
  }

  const token = authHeader.slice(7)
  if (!token) {
    return {
      error: NextResponse.json({ error: 'Empty bearer token' }, { status: 401 }),
    }
  }

  const keyHash = await sha256hex(token)

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      userId: true,
      permissions: true,
      name: true,
      status: true,
      requestLimit: true,
      totalRequests: true,
      expiresAt: true,
    },
  })

  if (!apiKey) {
    return {
      error: NextResponse.json({ error: 'Invalid API key' }, { status: 401 }),
    }
  }

  if (apiKey.status !== 'active') {
    return {
      error: NextResponse.json(
        { error: `API key is ${apiKey.status}` },
        { status: 403 },
      ),
    }
  }

  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    return {
      error: NextResponse.json(
        { error: 'API key has expired' },
        { status: 403 },
      ),
    }
  }

  if (apiKey.totalRequests >= apiKey.requestLimit) {
    return {
      error: NextResponse.json(
        { error: 'Request limit exceeded' },
        { status: 429 },
      ),
    }
  }

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: {
      totalRequests: { increment: 1 },
      lastUsedAt: new Date(),
    },
  })

  await auditLog({
    userId: apiKey.userId,
    action: 'api_key.external_request',
    entityType: 'api_key',
    entityId: apiKey.id,
    newValues: { keyId: apiKey.id, keyName: apiKey.name },
    ip: getClientIp(request),
    userAgent: getClientUserAgent(request),
  })

  return {
    user: {
      keyId: apiKey.id,
      userId: apiKey.userId,
      permissions: apiKey.permissions,
      name: apiKey.name,
    },
  }
}
