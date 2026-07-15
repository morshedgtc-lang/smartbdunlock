import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const all = searchParams.get('all') === 'true'
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))

    const where: Record<string, unknown> = {}

    if (all && user.role === 'admin') {
      // Admin can see all notifications
    } else {
      where.userId = user.id
    }

    if (unreadOnly) {
      where.read = false
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: {
          ...(all && user.role === 'admin' ? {} : { userId: user.id }),
          read: false,
        },
      }),
    ])

    return NextResponse.json({ notifications, unreadCount })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown'
    if (msg === 'Unauthorized') return NextResponse.json({ error: msg }, { status: 401 })
    if (msg === 'Forbidden') return NextResponse.json({ error: msg }, { status: 403 })
    console.error('Notifications GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { id } = body as { id?: string }

    if (id) {
      const notification = await prisma.notification.findUnique({ where: { id } })
      if (!notification) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
      }
      if (notification.userId !== user.id && user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      await prisma.notification.update({
        where: { id },
        data: { read: true },
      })
    } else {
      const where: Record<string, unknown> = {}
      if (user.role !== 'admin') {
        where.userId = user.id
      }
      where.read = false

      await prisma.notification.updateMany({
        where,
        data: { read: true },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown'
    if (msg === 'Unauthorized') return NextResponse.json({ error: msg }, { status: 401 })
    if (msg === 'Forbidden') return NextResponse.json({ error: msg }, { status: 403 })
    console.error('Notifications PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const user = await requireAuth()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const where: Record<string, unknown> = {
      read: true,
      createdAt: { lt: thirtyDaysAgo },
    }

    if (user.role !== 'admin') {
      where.userId = user.id
    }

    const result = await prisma.notification.deleteMany({ where })

    return NextResponse.json({ success: true, deleted: result.count })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown'
    if (msg === 'Unauthorized') return NextResponse.json({ error: msg }, { status: 401 })
    if (msg === 'Forbidden') return NextResponse.json({ error: msg }, { status: 403 })
    console.error('Notifications DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 })
  }
}
