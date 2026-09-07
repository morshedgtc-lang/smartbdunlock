import { prisma } from '@/lib/prisma'
import { authenticateApiKey } from '@/lib/api-key-auth'
import { serializeOrder } from '@/lib/order-api'
import { okResponse, errorResponse } from '@/lib/api-response'
import { withApiLogging } from '@/lib/api-request'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const log = withApiLogging(request, {})
  try {
    const auth = await authenticateApiKey(request)
    if ('error' in auth) return log.finish(auth.error, { errorCode: 'AUTH_FAILED' })

    const { reference } = await params
    const order = await prisma.order.findFirst({
      where: {
        userId: auth.user.userId,
        OR: [{ externalId: reference }, { id: reference }, { orderNumber: reference }],
      },
      include: {
        service: { select: { name: true, type: true } },
        customValues: {
          include: {
            customField: {
              select: { label: true, fieldType: true, visibleToClient: true },
            },
          },
        },
      },
    })

    if (!order) {
      return log.finish(errorResponse('Order not found', 'NOT_FOUND', 404), { errorCode: 'NOT_FOUND' })
    }

    return log.finish(okResponse({ order: serializeOrder(order) }))
  } catch (error) {
    console.error('v1 Order GET error:', error)
    return log.finish(errorResponse('Failed to fetch order', 'INTERNAL_ERROR', 500), { errorCode: 'INTERNAL_ERROR' })
  }
}