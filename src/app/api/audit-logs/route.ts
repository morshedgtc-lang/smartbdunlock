import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import type { AuditLog } from '@prisma/client'

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || ''
    const entityType = searchParams.get('entityType') || ''
    const moduleFilter = searchParams.get('module') || ''
    const userId = searchParams.get('userId') || ''
    const search = searchParams.get('search') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '100')))
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'))
    const exportCsv = searchParams.get('export') === 'csv'

    const where: Record<string, unknown> = {}
    if (action) where.action = action
    if (entityType) where.entityType = entityType
    if (moduleFilter) where.module = moduleFilter
    if (userId) where.userId = userId
    if (search) {
      where.OR = [
        { userEmail: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom)
      if (dateTo) (where.createdAt as Record<string, unknown>).lte = new Date(dateTo + 'T23:59:59.999Z')
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ])

    if (exportCsv) {
      const headers = ['Time', 'User', 'Action', 'Module', 'Entity', 'Entity ID', 'Description', 'IP', 'Old Values', 'New Values']
      const rows = logs.map((log: AuditLog) => [
        new Date(log.createdAt).toISOString(),
        log.userEmail || '',
        log.action,
        log.module || '',
        log.entityType,
        log.entityId || '',
        log.description || '',
        log.ip || '',
        log.oldValues || '',
        log.newValues || '',
      ])
      const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n')
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    }

    return NextResponse.json({ logs, total, offset, limit })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown'
    if (msg === 'Unauthorized') return NextResponse.json({ error: msg }, { status: 401 })
    if (msg === 'Forbidden') return NextResponse.json({ error: msg }, { status: 403 })
    console.error('Audit logs GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}
