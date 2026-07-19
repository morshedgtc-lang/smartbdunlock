import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    await requireAdmin()

    const url = new URL(request.url)
    const status = url.searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        userId: true,
        name: true,
        username: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        emailVerifiedAt: true,
        walletBalance: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Admin list users error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
