import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get('keyId') || undefined
    const userId = searchParams.get('userId') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

    const where: Record<string, unknown> = {}
    if (keyId) where.keyId = keyId
    if (userId) where.userId = userId

    const logs = await prisma.apiRequestLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const keyIds = [...new Set(logs.map((l) => l.keyId).filter(Boolean))] as string[]
    const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[]

    const [keys, users] = await Promise.all([
      prisma.apiKey.findMany({
        where: { id: { in: keyIds } },
        select: { id: true, name: true, keyPrefix: true },
      }),
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true, role: true },
      }),
    ])

    const keyMap = new Map(keys.map((k) => [k.id, k]))
    const userMap = new Map(users.map((u) => [u.id, u]))

    const errorCount = await prisma.apiRequestLog.count({
      where: { ...where, statusCode: { gte: 400 } },
    })

    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        requestId: l.requestId,
        key: l.keyId ? keyMap.get(l.keyId) || null : null,
        user: l.userId ? userMap.get(l.userId) || null : null,
        endpoint: l.endpoint,
        method: l.method,
        statusCode: l.statusCode,
        durationMs: l.durationMs,
        errorCode: l.errorCode,
        externalId: l.externalId,
        ip: l.ip,
        createdAt: l.createdAt,
      })),
      meta: {
        total: logs.length,
        errors: errorCount,
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('API logs GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch API logs' }, { status: 500 })
  }
}