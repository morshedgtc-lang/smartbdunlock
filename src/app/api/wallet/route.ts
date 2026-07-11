import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { applyBalance } from '@/lib/wallet'

const ALLOWED_TYPES = ['deposit', 'withdraw', 'transfer'] as const
type WalletType = (typeof ALLOWED_TYPES)[number]

function isWalletType(value: unknown): value is WalletType {
  return typeof value === 'string' && (ALLOWED_TYPES as readonly string[]).includes(value)
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        walletBalance: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const transactions = await prisma.transaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({
      balance: user.walletBalance,
      transactions,
    })
  } catch (error) {
    console.error('Wallet fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { type, amount, description, targetUserId } = body

    if (!isWalletType(type)) {
      return NextResponse.json(
        { error: 'Invalid transaction type' },
        { status: 400 }
      )
    }

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      )
    }

    const role = session.user.role

    // Only admin can deposit / withdraw
    if ((type === 'deposit' || type === 'withdraw') && role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admin can deposit or withdraw funds' },
        { status: 403 }
      )
    }

    // Only admin or reseller can transfer
    if (type === 'transfer' && role !== 'admin' && role !== 'reseller') {
      return NextResponse.json(
        { error: 'Only admins or resellers can transfer funds' },
        { status: 403 }
      )
    }

    // Transfers
    if (type === 'transfer') {
      if (!targetUserId) {
        return NextResponse.json(
          { error: 'Target user ID is required for transfers' },
          { status: 400 }
        )
      }

      if (targetUserId === session.user.id) {
        return NextResponse.json(
          { error: 'Cannot transfer funds to yourself' },
          { status: 400 }
        )
      }

      const result = await prisma.$transaction(async (tx) => {
        const targetUser = await tx.user.findUnique({
          where: { id: targetUserId },
          select: { id: true, resellerId: true },
        })
        if (!targetUser) {
          throw new Error('TARGET_NOT_FOUND')
        }

        // Resellers can only transfer to users assigned to them
        if (role === 'reseller' && targetUser.resellerId !== session.user.id) {
          throw new Error('TRANSFER_NOT_ALLOWED')
        }

        // Atomic debit of sender (throws INSUFFICIENT_BALANCE if too low)
        await applyBalance(tx, session.user.id, -amount, {
          type: 'transfer',
          description: description || 'Transfer to user',
          targetUserId,
        })

        // Atomic credit of target
        await applyBalance(tx, targetUserId, amount, {
          type: 'deposit',
          description: description || 'Transfer from reseller',
        })

        return { success: true }
      }).catch((e: unknown) => {
        if (e instanceof Error && e.message === 'TARGET_NOT_FOUND') {
          return { __error: 'Target user not found', __status: 404 }
        }
        if (e instanceof Error && e.message === 'TRANSFER_NOT_ALLOWED') {
          return { __error: 'You can only transfer to your assigned users', __status: 403 }
        }
        if (e instanceof Error && e.message === 'INSUFFICIENT_BALANCE') {
          return { __error: 'Insufficient balance', __status: 400 }
        }
        throw e
      })

      if (result && '__error' in result) {
        return NextResponse.json(
          { error: result.__error },
          { status: (result as { __status: number }).__status }
        )
      }

      return NextResponse.json({ success: true }, { status: 201 })
    }

    // Deposit / withdraw (admin only, enforced above)
    const result = await prisma
      .$transaction(async (tx) => {
        await applyBalance(tx, session.user.id, type === 'deposit' ? amount : -amount, {
          type,
          description,
        })
        return { success: true }
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.message === 'INSUFFICIENT_BALANCE') {
          return { __error: 'Insufficient balance', __status: 400 }
        }
        throw e
      })

    if (result && '__error' in result) {
      return NextResponse.json(
        { error: result.__error },
        { status: (result as { __status: number }).__status }
      )
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Wallet transaction error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
