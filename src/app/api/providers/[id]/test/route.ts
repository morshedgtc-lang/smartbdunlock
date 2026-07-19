import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { decryptApiKey } from '@/lib/crypto'
import { getAdapter } from '@/lib/suppliers'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const provider = await prisma.supplier.findUnique({ where: { id } })
    if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

    const config = parseConfig(provider.config)
    const apiUrl = String(config?.apiUrl || '')
    const encryptedKey = provider.apiKeyEncrypted || provider.apiKey

    if (!apiUrl || !encryptedKey) {
      return NextResponse.json({ error: 'Missing API URL or API key' }, { status: 400 })
    }

    let apiKey: string
    try {
      apiKey = decryptApiKey(encryptedKey)
    } catch {
      apiKey = encryptedKey
    }

    const adapter = getAdapter(provider.type)
    const start = Date.now()
    const result = await adapter.testConnection(apiUrl, apiKey)
    const latencyMs = result.latencyMs || Date.now() - start

    await prisma.supplierApiLog.create({
      data: {
        providerId: id,
        endpoint: `${apiUrl}/services`,
        method: 'GET',
        requestTime: new Date(start),
        responseTime: new Date(),
        statusCode: result.success ? 200 : 400,
        success: result.success,
        errorMessage: result.success ? null : result.message,
      },
    })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'provider.test',
      entityType: 'supplier',
      entityId: id,
      newValues: { success: result.success, message: result.message, latencyMs },
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({ success: result.success, message: result.message, latencyMs })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Provider test error:', error)
    return NextResponse.json({ error: 'Test failed' }, { status: 500 })
  }
}

function parseConfig(config: string | null): Record<string, unknown> | null {
  if (!config) return null
  try {
    const parsed = JSON.parse(config)
    return typeof parsed === 'object' && parsed !== null ? parsed : null
  } catch {
    return null
  }
}
