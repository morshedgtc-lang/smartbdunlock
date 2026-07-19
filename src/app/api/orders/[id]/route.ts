import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            userId: true,
            walletBalance: true,
          },
        },
        service: {
          select: { name: true, type: true, processingTime: true, category: { select: { name: true } } },
        },
        supplier: { select: { name: true } },
        customValues: {
          include: { customField: { select: { label: true, fieldType: true, previewImage: true } } },
        },
        attachments: { orderBy: { createdAt: 'asc' } },
        transactions: {
          where: { OR: [{ type: 'order_payment' }, { type: 'order_refund' }] },
          orderBy: { createdAt: 'desc' },
        },
        orderNotes: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (user.role !== 'admin' && order.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const isAdmin = user.role === 'admin'

    const timeline = order.orderNotes.map((n) => ({
      id: n.id,
      authorName: n.authorName,
      content: n.content,
      visible: n.visible,
      createdAt: n.createdAt,
    }))

    const payments = order.transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      balanceAfter: t.balanceAfter,
      description: t.description,
      status: t.status,
      reference: t.reference,
      createdAt: t.createdAt,
    }))

    const logs = await prisma.auditLog.findMany({
      where: { entityType: 'order', entityId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      priority: order.priority,
      imei: order.imei,
      deviceInfo: order.deviceInfo,
      cost: order.cost,
      sellingPrice: order.sellingPrice,
      profit: order.profit,
      notes: order.notes,
      internalNotes: isAdmin ? order.internalNotes : undefined,
      result: order.result,
      completedAt: order.completedAt,
      assignedTo: order.assignedTo,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      user: {
        id: order.user.id,
        name: order.user.name,
        email: order.user.email,
        phone: order.user.phone,
        userId: order.user.userId,
        walletBalance: order.user.walletBalance,
      },
      service: {
        name: order.service?.name,
        type: order.service?.type,
        processingTime: order.service?.processingTime,
        category: order.service?.category?.name,
      },
      supplier: order.supplier?.name || null,
      customValues: order.customValues.map((cv) => ({
        id: cv.id,
        label: cv.customField?.label,
        fieldType: cv.customField?.fieldType,
        previewImage: cv.customField?.previewImage,
        value: cv.value,
      })),
      attachments: order.attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        fileUrl: a.fileUrl,
        fileType: a.fileType,
        fileSize: a.fileSize,
        uploadedByName: a.uploadedByName,
        createdAt: a.createdAt,
      })),
      timeline,
      messages: isAdmin
        ? order.orderNotes
        : order.orderNotes.filter((n) => n.visible),
      payments,
      logs: logs.map((l) => ({
        id: l.id,
        action: l.action,
        description: l.description,
        module: l.module,
        createdAt: l.createdAt,
      })),
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    console.error('Order detail error:', error)
    return NextResponse.json({ error: 'Failed to load order' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await params

    const order = await prisma.order.findUnique({ where: { id } })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    await prisma.order.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    console.error('Order delete error:', error)
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 })
  }
}
