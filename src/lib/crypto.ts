import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16

function getKey(): Buffer {
  const key = process.env.SUPPLIER_ENCRYPTION_KEY
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SUPPLIER_ENCRYPTION_KEY environment variable is required in production')
    }
    console.warn('⚠️ SUPPLIER_ENCRYPTION_KEY not set — using insecure fallback for development only')
    return Buffer.from('dev-only-insecure-32byte-fallback!!', 'utf-8')
  }
  const buf = Buffer.from(key, 'hex')
  if (buf.length !== 32) {
    throw new Error('SUPPLIER_ENCRYPTION_KEY must be 32 bytes (64 hex characters)')
  }
  return buf
}

export function encryptApiKey(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decryptApiKey(encryptedBase64: string): string {
  const key = getKey()
  const data = Buffer.from(encryptedBase64, 'base64')
  const iv = data.subarray(0, IV_LENGTH)
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}
