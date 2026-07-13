import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    const user = await requireAuth()

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { walletBalance: true },
    })

    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({
      balance: userData?.walletBalance || 0,
      transactions,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    console.error('Wallet GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch wallet' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { type, amount, description, targetUserId } = body

    const allowed = ['deposit', 'withdraw', 'transfer']
    if (!allowed.includes(type)) return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 })
    if (!amount || amount <= 0) return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })

    if ((type === 'deposit' || type === 'withdraw') && user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admin can deposit or withdraw funds' }, { status: 403 })
    }

    const result = await prisma.$transaction(async (tx) => {
      if (type === 'transfer') {
        if (!targetUserId) throw new Error('Target user ID is required for transfers')
        if (targetUserId === user.id) throw new Error('Cannot transfer funds to yourself')

        const target = await tx.user.findUnique({ where: { id: targetUserId } })
        if (!target) throw new Error('Target user not found')
        if (user.role === 'reseller' && target.resellerId !== user.id) {
          throw new Error('You can only transfer to your assigned users')
        }

        const senderUpdated = await tx.user.updateMany({
          where: { id: user.id, walletBalance: { gte: amount } },
          data: { walletBalance: { decrement: amount } },
        })
        if (senderUpdated.count === 0) throw new Error('Insufficient balance')

        const senderAfter = await tx.user.findUnique({ where: { id: user.id }, select: { walletBalance: true } })
        await tx.transaction.create({
          data: {
            id: crypto.randomUUID(),
            userId: user.id,
            type: 'transfer',
            amount: -amount,
            balanceAfter: senderAfter!.walletBalance,
            description: description || 'Transfer to user',
          },
        })

        const targetUpdated = await tx.user.updateMany({
          where: { id: targetUserId },
          data: { walletBalance: { increment: amount } },
        })
        if (targetUpdated.count === 0) throw new Error('Target user not found')

        const targetAfter = await tx.user.findUnique({ where: { id: targetUserId }, select: { walletBalance: true } })
        await tx.transaction.create({
          data: {
            id: crypto.randomUUID(),
            userId: targetUserId,
            type: 'deposit',
            amount,
            balanceAfter: targetAfter!.walletBalance,
            description: description || 'Transfer from reseller',
          },
        })

        return { success: true }
      }

      const delta = type === 'deposit' ? amount : -amount

      if (delta < 0) {
        const updated = await tx.user.updateMany({
          where: { id: user.id, walletBalance: { gte: amount } },
          data: { walletBalance: { decrement: amount } },
        })
        if (updated.count === 0) throw new Error('Insufficient balance')
      } else {
        await tx.user.updateMany({
          where: { id: user.id },
          data: { walletBalance: { increment: amount } },
        })
      }

      const after = await tx.user.findUnique({ where: { id: user.id }, select: { walletBalance: true } })
      await tx.transaction.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          type,
          amount: delta,
          balanceAfter: after!.walletBalance,
          description,
        },
      })

      return { success: true }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('Wallet POST error:', error)
    return NextResponse.json({ error: error.message || 'Transaction failed' }, { status: 500 })
  }
}
