import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'
import { decryptApiKey } from '@/lib/crypto'
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
      select: { id: true, name: true, status: true, keyEncrypted: true },
    })
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }
    if (apiKey.status !== 'active') {
      return NextResponse.json({ error: 'Only active API keys can be revealed' }, { status: 403 })
    }

    if (!apiKey.keyEncrypted) {
      return NextResponse.json(
        { error: 'This key cannot be revealed; rotate it to generate a new key' },
        { status: 409 },
      )
    }

    let key: string
    try {
      key = decryptApiKey(apiKey.keyEncrypted)
    } catch {
      return NextResponse.json({ error: 'Failed to decrypt API key' }, { status: 500 })
    }

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'api_key.reveal',
      entityType: 'api_key',
      entityId: apiKey.id,
      newValues: { keyName: apiKey.name },
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({ key })
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('Reseller API key reveal error:', error)
    return NextResponse.json({ error: 'Failed to reveal API key' }, { status: 500 })
  }
}