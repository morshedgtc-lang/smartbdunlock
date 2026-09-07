import { prisma } from '@/lib/prisma'
import { authenticateApiKey } from '@/lib/api-key-auth'
import { okResponse, errorResponse } from '@/lib/api-response'
import { withApiLogging } from '@/lib/api-request'

export async function GET(request: Request) {
  const log = withApiLogging(request, {})
  try {
    const auth = await authenticateApiKey(request)
    if ('error' in auth) return log.finish(auth.error, { errorCode: 'AUTH_FAILED' })

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || undefined
    const type = searchParams.get('type') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200)

    const [overrides, services] = await Promise.all([
      prisma.resellerService.findMany({ where: { userId: auth.user.userId } }),
      prisma.service.findMany({
        where: {
          clientVisible: true,
          status: 'active',
          ...(type ? { type } : {}),
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: 'insensitive' as const } },
                  { description: { contains: search, mode: 'insensitive' as const } },
                ],
              }
            : {}),
        },
        orderBy: { name: 'asc' },
        take: limit,
        include: {
          category: { select: { name: true } },
          customFields: {
            where: { visibleToClient: true },
            orderBy: { order: 'asc' },
          },
        },
      }),
    ])

    const overrideMap = new Map(overrides.map((o) => [o.serviceId, o]))

    const allowed = overrides.length > 0
      ? services.filter((s) => overrideMap.has(s.id) && overrideMap.get(s.id)!.enabled)
      : services

    return log.finish(
      okResponse({
        services: allowed.map((s) => {
          const override = overrideMap.get(s.id)
          return {
            id: s.id,
            name: s.name,
            description: s.description,
            type: s.type,
            price: override ? (override.price ?? s.sellingPrice) : s.sellingPrice,
            processing_time: s.processingTime,
            category_name: s.category?.name,
            custom_fields: s.customFields.map((f) => ({
              id: f.id,
              field_type: f.fieldType,
              label: f.label,
              placeholder: f.placeholder,
              options: f.options,
              required: f.required,
            })),
          }
        }),
      }),
    )
  } catch (error) {
    console.error('v1 Services GET error:', error)
    return log.finish(errorResponse('Failed to fetch services', 'INTERNAL_ERROR', 500), { errorCode: 'INTERNAL_ERROR' })
  }
}