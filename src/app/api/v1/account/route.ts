import { prisma } from '@/lib/prisma'
import { authenticateApiKey } from '@/lib/api-key-auth'
import { okResponse, errorResponse } from '@/lib/api-response'
import { withApiLogging } from '@/lib/api-request'

export async function GET(request: Request) {
  const log = withApiLogging(request, {})
  try {
    const auth = await authenticateApiKey(request)
    if ('error' in auth) return log.finish(auth.error, { errorCode: 'AUTH_FAILED' })

    const [apiKey, user] = await Promise.all([
      prisma.apiKey.findUnique({
        where: { id: auth.user.keyId },
        select: {
          name: true,
          status: true,
          permissions: true,
          requestLimit: true,
          totalRequests: true,
          expiresAt: true,
          createdAt: true,
          lastUsedAt: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: auth.user.userId },
        select: { name: true, email: true, role: true, status: true },
      }),
    ])

    return log.finish(
      okResponse({
        account: {
          name: user?.name,
          email: user?.email,
          role: user?.role,
          status: user?.status,
        },
        key: {
          name: apiKey?.name,
          status: apiKey?.status,
          permissions: apiKey?.permissions,
          rate_limit: {
            per_minute: apiKey?.requestLimit,
            used_this_minute: await customRequestsInWindow(auth.user.keyId),
            total_requests: apiKey?.totalRequests,
          },
          expires_at: apiKey?.expiresAt,
          created_at: apiKey?.createdAt,
          last_used_at: apiKey?.lastUsedAt,
        },
      }),
    )
  } catch (error) {
    console.error('v1 Account GET error:', error)
    return log.finish(errorResponse('Failed to fetch account', 'INTERNAL_ERROR', 500), { errorCode: 'INTERNAL_ERROR' })
  }
}

async function customRequestsInWindow(keyId: string): Promise<number> {
  const key = await prisma.apiKey.findUnique({
    where: { id: keyId },
    select: { requestsInWindow: true, windowStartedAt: true },
  })
  if (!key || !key.windowStartedAt) return 0
  if (Date.now() - key.windowStartedAt.getTime() > 60 * 1000) return 0
  return key.requestsInWindow
}