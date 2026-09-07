import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'
import { validateBody } from '@/lib/validations'
import { enqueueWebhookEvent } from '@/lib/webhooks'
import { z } from 'zod'

const createNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required'),
  visible: z.boolean().optional().default(true),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id: orderId } = await params

    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (user.role !== 'admin' && order.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const where: Record<string, unknown> = { orderId }
    if (user.role !== 'admin') {
      where.visible = true
    }

    const notes = await prisma.orderNote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ notes })
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('Order notes GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id: orderId } = await params
    const body = await request.json()
    const validation = validateBody(createNoteSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { content, visible } = validation.data

    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (user.role !== 'admin' && order.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const noteVisible = user.role === 'admin' ? visible : true

    const note = await prisma.orderNote.create({
      data: {
        id: crypto.randomUUID(),
        orderId,
        authorId: user.id,
        authorName: user.name,
        content,
        visible: noteVisible,
      },
    })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'order.note.add',
      entityType: 'order',
      entityId: orderId,
      newValues: { noteId: note.id, visible: noteVisible },
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    if (user.role === 'admin' && noteVisible) {
      await enqueueWebhookEvent({
        userId: order.userId,
        event: 'order.replied',
        orderId,
      })
    }

    return NextResponse.json(note, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('Order notes POST error:', error)
    return NextResponse.json({ error: 'Failed to add note' }, { status: 500 })
  }
}
