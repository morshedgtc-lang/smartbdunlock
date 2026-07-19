import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { decryptSecret, verifyToken, generateBackupCodes } from '@/lib/totp'
import { auditLog } from '@/lib/audit'

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const { token } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { totpSecret: true },
    })

    if (!dbUser?.totpSecret) {
      return NextResponse.json({ error: 'TOTP not set up. Call /api/auth/totp/setup first.' }, { status: 400 })
    }

    const secret = decryptSecret(dbUser.totpSecret)
    if (!(await verifyToken(token, secret))) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    const { plain: backupCodes } = await generateBackupCodes()
    await prisma.user.update({
      where: { id: user.id },
      data: { totpEnabled: true },
    })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'mfa.enabled',
      entityType: 'auth',
      entityId: user.id,
    })

    return NextResponse.json({
      success: true,
      backupCodes,
      message: 'Save these backup codes in a secure place. Each code can be used once.',
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Enable failed' }, { status: 500 })
  }
}
