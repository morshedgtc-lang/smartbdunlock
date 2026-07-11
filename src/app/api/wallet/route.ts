import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    if (!type || amount === undefined) {
      return NextResponse.json(
        { error: 'Type and amount are required' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be positive' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only admin can deposit funds directly
    if (type === 'deposit' && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admin can deposit funds' },
        { status: 403 }
      )
    }

    // Only admin can process withdrawals
    if (type === 'withdraw' && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admin can process withdrawals' },
        { status: 403 }
      )
    }

    // Reseller can transfer to their own customers
    if (type === 'transfer') {
      if (session.user.role !== 'reseller' && session.user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only resellers or admin can transfer funds' },
          { status: 403 }
        )
      }

      if (!targetUserId) {
        return NextResponse.json(
          { error: 'Target user ID is required for transfers' },
          { status: 400 }
        )
      }

      // Verify target user exists
      if (session.user.role === 'reseller') {
        const targetUser = await prisma.user.findUnique({
          where: { id: targetUserId },
        })
        if (!targetUser) {
          return NextResponse.json(
            { error: 'Target user not found' },
            { status: 404 }
          )
        }
      }

      if (user.walletBalance < amount) {
        return NextResponse.json(
          { error: 'Insufficient balance' },
          { status: 400 }
        )
      }
    }

    // Check balance for admin withdrawals
    if (type === 'withdraw' && user.walletBalance < amount) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      )
    }

    // Handle transfers between users
    if (type === 'transfer') {
      const result = await prisma.$transaction(async (tx) => {
        // Deduct from sender
        const senderTransaction = await tx.transaction.create({
          data: {
            userId: session.user.id,
            type: 'transfer',
            amount: -amount,
            balanceAfter: user.walletBalance - amount,
            description: description || `Transfer to user`,
          },
        })

        await tx.user.update({
          where: { id: session.user.id },
          data: { walletBalance: user.walletBalance - amount },
        })

        // Credit to target
        const targetUser = await tx.user.findUnique({
          where: { id: targetUserId },
        })

        await tx.transaction.create({
          data: {
            userId: targetUserId,
            type: 'deposit',
            amount: amount,
            balanceAfter: (targetUser?.walletBalance || 0) + amount,
            description: description || `Transfer from reseller`,
          },
        })

        await tx.user.update({
          where: { id: targetUserId },
          data: { walletBalance: (targetUser?.walletBalance || 0) + amount },
        })

        return senderTransaction
      })

      return NextResponse.json(result, { status: 201 })
    }

    // Standard deposit/withdraw (admin only)
    const newBalance = type === 'deposit' || type === 'order_refund'
      ? user.walletBalance + amount
      : user.walletBalance - amount

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId: session.user.id,
          type,
          amount: type === 'deposit' || type === 'order_refund' ? amount : -amount,
          balanceAfter: newBalance,
          description,
        },
      })

      await tx.user.update({
        where: { id: session.user.id },
        data: { walletBalance: newBalance },
      })

      return transaction
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Wallet transaction error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
