import { createHash, randomBytes } from 'crypto'

export const API_KEY_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const API_KEY_PATTERN = /^[A-HJ-NP-Z2-9]{3}(?:-[A-HJ-NP-Z2-9]{3}){7}$/

function randomCharFrom(charset: string): string {
  const buf = randomBytes(1)
  return charset[buf[0] % charset.length]
}

export function generateApiKey(): string {
  const groups = Array.from({ length: 8 }, () =>
    Array.from({ length: 3 }, () => randomCharFrom(API_KEY_CHARSET)).join(''),
  )
  return groups.join('-')
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export function keyPrefixFor(plainKey: string): string {
  return `${plainKey.slice(0, 7)}****`
}