import { NextResponse } from 'next/server'
import { createSession } from '@/lib/auth'
import { consumeChallengeToken, verifyMfaChallenge } from '@/lib/mfa'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { token, code } = await request.json()
    if (!token || !code) {
      return NextResponse.json({ error: 'Token and code are required' }, { status: 400 })
    }

    const userId = consumeChallengeToken(token)
    if (!userId) {
      return NextResponse.json({ error: 'Challenge expired. Please log in again.' }, { status: 401 })
    }

    const result = await verifyMfaChallenge(userId, code)
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Invalid code' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await createSession({
      id: user.id,
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
    })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'login.mfa_complete',
      entityType: 'auth',
      entityId: user.id,
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    })
  } catch (error) {
    console.error('TOTP challenge error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
