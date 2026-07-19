import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { generateSecret, getProvisioningUri, encryptSecret } from '@/lib/totp'

export async function POST() {
  try {
    const user = await requireAuth()
    const secret = generateSecret()
    const encrypted = encryptSecret(secret)
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: encrypted, totpEnabled: false },
    })
    return NextResponse.json({
      secret,
      uri: getProvisioningUri(secret, user.email),
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 })
  }
}
