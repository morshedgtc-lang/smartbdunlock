import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin()

    const { id } = await params
    const body = await request.json()
    const { action } = body

    if (!['approve', 'reject', 'suspend', 'unsuspend'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let newStatus: string
    switch (action) {
      case 'approve': newStatus = 'active'; break
      case 'reject': newStatus = 'banned'; break
      case 'suspend': newStatus = 'suspended'; break
      case 'unsuspend': newStatus = 'active'; break
      default: return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    await prisma.user.update({ where: { id }, data: { status: newStatus } })

    await auditLog({
      userId: session.id,
      userEmail: session.email,
      action: `admin.user.${action}`,
      entityType: 'user',
      entityId: id,
      newValues: { previousStatus: user.status, newStatus, targetEmail: user.email, targetUserId: user.userId },
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({ success: true, status: newStatus })
  } catch (error) {
    console.error('Admin user action error:', error)
    return NextResponse.json({ error: 'Action failed' }, { status: 500 })
  }
}
