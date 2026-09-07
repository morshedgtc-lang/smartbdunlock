import { describe, it, expect } from 'vitest'
import { createHash } from 'crypto'
import {
  API_KEY_CHARSET,
  API_KEY_PATTERN,
  generateApiKey,
  hashApiKey,
  keyPrefixFor,
} from '../src/lib/api-key'

describe('generateApiKey', () => {
  it('produces the dashed 8x3-char format', () => {
    const key = generateApiKey()
    expect(key).toMatch(API_KEY_PATTERN)
    expect(key.length).toBe(31) // 24 chars + 7 dashes
    expect((key.match(/-/g) || []).length).toBe(7)
    expect(key.split('-').every((g) => g.length === 3)).toBe(true)
  })

  it('only uses unambiguous alphanumerics (no 0/O/1/I)', () => {
    const keys = Array.from({ length: 200 }, () => generateApiKey())
    for (const key of keys) {
      for (const ch of key.replace(/-/g, '')) {
        expect(API_KEY_CHARSET).toContain(ch)
      }
    }
  })

  it('generates unique keys', () => {
    const keys = new Set(Array.from({ length: 200 }, () => generateApiKey()))
    expect(keys.size).toBe(200)
  })
})

describe('hashApiKey', () => {
  it('returns a stable SHA-256 hex digest', () => {
    const key = 'ABCD-EFGH-JKLM-NPQR-STUV-WXYZ-2345-6789'
    const a = hashApiKey(key)
    expect(a).toBe(hashApiKey(key))
    expect(a).toMatch(/^[a-f0-9]{64}$/)
    expect(a).toBe(createHash('sha256').update(key).digest('hex'))
  })

  it('differs for different keys', () => {
    expect(hashApiKey('AAAA-BBBB-CCCC-DDDD-EEEE-FFFF-GGGG-HHHH')).not.toBe(
      hashApiKey('AAAA-BBBB-CCCC-DDDD-EEEE-FFFF-GGGG-HHHI'),
    )
  })
})

describe('keyPrefixFor', () => {
  it('masks everything after the first 7 chars', () => {
    const key = 'ABCD-EFGH-JKLM-NPQR-STUV-WXYZ-2345-6789'
    const prefix = keyPrefixFor(key)
    expect(prefix).toBe('ABCD-EF****')
    expect(prefix.endsWith('****')).toBe(true)
  })
})

describe('API_KEY_PATTERN', () => {
  it('rejects wrong group counts and forbidden characters', () => {
    expect(API_KEY_PATTERN.test('ABC-DEF-GHJ-KMN-PQR-STU-VWX-234')).toBe(true)
    expect(API_KEY_PATTERN.test('ABC-DEF-GHJ-KMN')).toBe(false) // fewer groups
    expect(API_KEY_PATTERN.test('ABC-DEF-GHJ-KMN-PQR-STU-VWX-23')).toBe(false) // last group too short
    expect(API_KEY_PATTERN.test('ABC-DEF-0HJ-KMN-PQR-STU-VWX-234')).toBe(false) // contains 0
    expect(API_KEY_PATTERN.test('ABC-1EF-GHJ-KMN-PQR-STU-VWX-234')).toBe(false) // contains 1
    expect(API_KEY_PATTERN.test('ABC-IEF-GHJ-KMN-PQR-STU-VWX-234')).toBe(false) // contains I
    expect(API_KEY_PATTERN.test('ABC DEF GHJ KMN PQR STU VWX 234')).toBe(false) // spaces, not dashes
  })
})