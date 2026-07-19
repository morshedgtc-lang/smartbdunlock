import * as otplib from 'otplib'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { config } from './config'
import { encryptApiKey, decryptApiKey } from './crypto'

export function generateSecret(): string {
  return otplib.generateSecret()
}

export function encryptSecret(secret: string): string {
  return encryptApiKey(secret)
}

export function decryptSecret(encrypted: string): string {
  return decryptApiKey(encrypted)
}

export function getProvisioningUri(secret: string, email: string): string {
  return otplib.generateURI({ issuer: config.mfa.issuer, label: email, secret })
}

export async function verifyToken(token: string, secret: string): Promise<boolean> {
  try {
    const result = await otplib.verify({ token, secret })
    return result.valid
  } catch {
    return false
  }
}

export async function generateBackupCodes(): Promise<{ plain: string[]; hashed: string }> {
  const codes: string[] = []
  const hashed: string[] = []
  for (let i = 0; i < config.mfa.backupCodesCount; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    codes.push(code)
    hashed.push(await bcrypt.hash(code, config.bcrypt.rounds))
  }
  return { plain: codes, hashed: JSON.stringify(hashed) }
}

export async function verifyBackupCode(code: string, storedJson: string): Promise<{ valid: boolean; remaining: string[] }> {
  try {
    const hashed: string[] = JSON.parse(storedJson)
    for (let i = 0; i < hashed.length; i++) {
      if (await bcrypt.compare(code, hashed[i])) {
        const remaining = [...hashed]
        remaining.splice(i, 1)
        return { valid: true, remaining }
      }
    }
  } catch {
    // invalid JSON
  }
  return { valid: false, remaining: [] }
}
