import { prisma } from '@/lib/prisma'
import { authenticateApiKey } from '@/lib/api-key-auth'
import { okResponse, errorResponse } from '@/lib/api-response'
import { withApiLogging } from '@/lib/api-request'

export async function GET(request: Request) {
  const log = withApiLogging(request, {})
  try {
    const auth = await authenticateApiKey(request)
    if ('error' in auth) return log.finish(auth.error, { errorCode: 'AUTH_FAILED' })

    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      select: { walletBalance: true },
    })

    const transactions = await prisma.transaction.findMany({
      where: { userId: auth.user.userId },
      orderBy: { createdAt: 'desc' },
      take: 25,
    })

    return log.finish(
      okResponse({
        balance: user?.walletBalance ?? 0,
        currency: 'USD',
        transactions: transactions.map((t) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          balance_after: t.balanceAfter,
          description: t.description,
          order_id: t.orderId,
          created_at: t.createdAt,
        })),
      }),
    )
  } catch (error) {
    console.error('v1 Balance GET error:', error)
    return log.finish(errorResponse('Failed to fetch balance', 'INTERNAL_ERROR', 500), { errorCode: 'INTERNAL_ERROR' })
  }
}