import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'

export async function GET() {
  try {
    const user = await requireAuth()

    const logs = await prisma.auditLog.findMany({
      where: {
        action: 'file.upload',
        userId: user.id,
      },
      orderBy: { createdAt: 'desc' },
    })

    const files = logs.map((log) => {
      const values = log.newValues ? JSON.parse(log.newValues) : {}
      return {
        id: log.id,
        filename: values.filename || log.entityId,
        originalName: values.originalName,
        type: values.type,
        size: values.size,
        purpose: values.purpose || 'general',
        uploadedAt: log.createdAt,
      }
    })

    return NextResponse.json({ files })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Files GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 })
    }

    const log = await prisma.auditLog.findUnique({ where: { id } })
    if (!log || log.action !== 'file.upload') {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    if (user.role !== 'admin' && log.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.auditLog.delete({ where: { id } })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'file.delete',
      entityType: 'file',
      entityId: log.entityId || undefined,
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('Files DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
  }
}
