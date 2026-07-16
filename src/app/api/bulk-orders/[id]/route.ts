import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const batch = await prisma.bulkOrderBatch.findUnique({
      where: { id },
      include: {
        service: { select: { name: true, sellingPrice: true } },
        user: { select: { name: true, email: true } },
      },
    })
    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    if (user.role !== 'admin' && batch.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const orders = await prisma.order.findMany({
      where: { userId: batch.userId, serviceId: batch.serviceId, createdAt: { gte: batch.createdAt } },
      orderBy: { createdAt: 'desc' },
      select: { orderNumber: true, imei: true, status: true, createdAt: true },
    })

    return NextResponse.json({
      ...batch,
      serviceName: batch.service?.name,
      servicePrice: batch.service?.sellingPrice,
      userName: batch.user?.name,
      orders,
    })
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('BulkOrder detail error:', error)
    return NextResponse.json({ error: 'Failed to fetch batch' }, { status: 500 })
  }
}
