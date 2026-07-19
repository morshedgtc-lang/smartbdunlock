import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export async function POST() {
  try {
    const user = await requireAuth()
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: null, totpEnabled: false, backupCodes: null },
    })
    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'mfa.disabled',
      entityType: 'auth',
      entityId: user.id,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Disable failed' }, { status: 500 })
  }
}
