import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { walletPostSchema, validateBody } from '@/lib/validations'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'
import { createWalletNotification } from '@/lib/notifications'

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
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    console.error('Wallet GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch wallet' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const validation = validateBody(walletPostSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { type, amount, description, targetUserId } = validation.data

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
            description: `${description || 'Transfer to user'} (from ${user.userId})`,
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
            description: `${description || 'Transfer from client'} (to ${user.userId})`,
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
          description: `${description || type} (${user.userId})`,
        },
      })

      return { success: true }
    })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: `wallet.${type}`,
      entityType: 'transaction',
      entityId: user.id,
      newValues: { type, amount, targetUserId, description, userPublicId: user.userId },
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    if (type === 'transfer' && targetUserId) {
      await createWalletNotification(user.id, 'transfer', amount, description)
      await createWalletNotification(targetUserId, 'deposit', amount, description || 'Transfer received')
    } else {
      await createWalletNotification(user.id, type, amount, description || undefined)
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('Wallet POST error:', error)
    const msg = error instanceof Error ? error.message : 'Transaction failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
