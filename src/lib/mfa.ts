import { prisma } from './prisma'
import { decryptSecret, verifyToken, verifyBackupCode } from './totp'
import crypto from 'crypto'

const challengeTokens = new Map<string, { userId: string; expiresAt: number }>()

export function createChallengeToken(userId: string): string {
  const token = crypto.randomUUID()
  challengeTokens.set(token, { userId, expiresAt: Date.now() + 5 * 60 * 1000 })
  return token
}

export function consumeChallengeToken(token: string): string | null {
  const challenge = challengeTokens.get(token)
  if (!challenge || Date.now() > challenge.expiresAt) {
    challengeTokens.delete(token)
    return null
  }
  challengeTokens.delete(token)
  return challenge.userId
}

export async function verifyMfaChallenge(userId: string, code: string): Promise<{ success: boolean; error?: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || !user.totpEnabled || !user.totpSecret) {
    return { success: false, error: 'TOTP not configured' }
  }

  const secret = decryptSecret(user.totpSecret)
  let verified = await verifyToken(code, secret)

  if (!verified && user.backupCodes) {
    const { valid, remaining } = await verifyBackupCode(code, user.backupCodes)
    if (valid) {
      await prisma.user.update({
        where: { id: user.id },
        data: { backupCodes: remaining.length > 0 ? JSON.stringify(remaining) : null },
      })
      verified = true
    }
  }

  if (!verified) {
    return { success: false, error: 'Invalid verification code' }
  }

  return { success: true }
}
