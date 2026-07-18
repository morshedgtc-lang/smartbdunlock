import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const sessionUser = await getSession()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        userId: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        status: true,
        walletBalance: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 })
  }
}
