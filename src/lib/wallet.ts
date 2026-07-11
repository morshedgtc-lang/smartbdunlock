import { Prisma } from '@prisma/client'
import { prisma } from './prisma'

export type WalletTxType =
  | 'deposit'
  | 'withdraw'
  | 'transfer'
  | 'order_payment'
  | 'order_refund'

/**
 * Atomically credits or debits a user's wallet balance inside a Prisma
 * transaction. The balance condition is enforced at the database level via a
 * conditional update (`walletBalance: { gte: amount }`), so concurrent money
 * mutations can never overspend or corrupt the balance.
 *
 * @param tx       Prisma transaction client
 * @param userId   Target user id
 * @param amount   Positive = credit, negative = debit
 * @param opts     Transaction metadata
 * @returns        The new wallet balance
 * @throws         Error('INSUFFICIENT_BALANCE') when a debit would go negative
 */
export async function applyBalance(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  opts: {
    type: WalletTxType
    description?: string
    orderId?: string
    targetUserId?: string
  }
): Promise<number> {
  if (amount > 0) {
    const user = await tx.user.update({
      where: { id: userId },
      data: { walletBalance: { increment: amount } },
    })
    await tx.transaction.create({
      data: {
        userId,
        orderId: opts.orderId,
        type: opts.type,
        amount,
        balanceAfter: user.walletBalance,
        description: opts.description,
      },
    })
    return user.walletBalance
  }

  const debit = -amount
  const updated = await tx.user
    .update({
      where: { id: userId, walletBalance: { gte: debit } },
      data: { walletBalance: { decrement: debit } },
    })
    .catch((e: unknown) => {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new Error('INSUFFICIENT_BALANCE')
      }
      throw e
    })

  await tx.transaction.create({
    data: {
      userId,
      orderId: opts.orderId,
      type: opts.type,
      amount,
      balanceAfter: updated.walletBalance,
      description: opts.description,
    },
  })
  return updated.walletBalance
}

export async function getUserBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletBalance: true },
  })
  if (!user) throw new Error('USER_NOT_FOUND')
  return user.walletBalance
}
