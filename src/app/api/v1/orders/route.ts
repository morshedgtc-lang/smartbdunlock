import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { authenticateApiKey } from '@/lib/api-key-auth'
import { createApiOrder, serializeOrder } from '@/lib/order-api'
import { okResponse, errorResponse } from '@/lib/api-response'
import { withApiLogging } from '@/lib/api-request'
import { z } from 'zod'

const createOrderRequestSchema = z.object({
  service_id: z.string().min(1, 'service_id is required'),
  external_id: z
    .string()
    .min(1, 'external_id is required')
    .max(128, 'external_id must be 128 characters or fewer')
    .regex(/^[A-Za-z0-9:_-]+$/, 'external_id may only contain letters, numbers, and : _ -'),
  imei: z.string().optional(),
  device_info: z.string().optional(),
  notes: z.string().optional(),
  custom_field_values: z.record(z.string(), z.unknown()).optional(),
})

export async function GET(request: Request) {
  const log = withApiLogging(request, {})
  try {
    const auth = await authenticateApiKey(request)
    if ('error' in auth) return log.finish(auth.error, { errorCode: 'AUTH_FAILED' })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    const where: Prisma.OrderWhereInput = { userId: auth.user.userId }
    if (status) where.status = status

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
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
      }),
    ])

    return log.finish(
      okResponse(
        { orders: orders.map(serializeOrder) },
        { pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
      ),
    )
  } catch (error) {
    console.error('v1 Orders GET error:', error)
    return log.finish(errorResponse('Failed to fetch orders', 'INTERNAL_ERROR', 500), { errorCode: 'INTERNAL_ERROR' })
  }
}

export async function POST(request: Request) {
  const log = withApiLogging(request, {})
  try {
    const auth = await authenticateApiKey(request)
    if ('error' in auth) return log.finish(auth.error, { errorCode: 'AUTH_FAILED' })

    if (auth.user.permissions !== 'write' && auth.user.permissions !== 'admin') {
      return log.finish(errorResponse('Write permission required', 'FORBIDDEN', 403), { errorCode: 'FORBIDDEN' })
    }

    const body = await request.json()
    const parsed = createOrderRequestSchema.safeParse(body)
    if (!parsed.success) {
      return log.finish(
        errorResponse(parsed.error.issues[0]?.message || 'Invalid request', 'VALIDATION_ERROR', 400),
        { errorCode: 'VALIDATION_ERROR' },
      )
    }
    const input = parsed.data

    const result = await createApiOrder({
      userId: auth.user.userId,
      serviceId: input.service_id,
      externalId: input.external_id,
      imei: input.imei,
      deviceInfo: input.device_info,
      notes: input.notes,
      customFieldValues: input.custom_field_values,
      source: 'api',
    })

    if (!result.ok) {
      return log.finish(errorResponse(result.message, result.code, result.status), {
        errorCode: result.code,
        externalId: input.external_id,
      })
    }

    return log.finish(
      okResponse(
        {
          order: result.order,
          idempotent_replay: result.existing ? true : false,
          charged: result.charged,
          wallet_balance: result.newBalance,
        },
        undefined,
      ),
      { externalId: input.external_id },
    )
  } catch (error) {
    console.error('v1 Orders POST error:', error)
    return log.finish(errorResponse('Order creation failed', 'INTERNAL_ERROR', 500), { errorCode: 'INTERNAL_ERROR' })
  }
}