import { cookies } from 'next/headers'
import { createHmac, randomBytes } from 'crypto'

export const CSRF_COOKIE_NAME = 'sbdu_csrf'
const TOKEN_LENGTH = 32
const MAX_AGE_SECONDS = 60 * 60

export function generateCsrfToken(): string {
  return randomBytes(TOKEN_LENGTH).toString('hex')
}

export async function readCsrfCookie(): Promise<string | undefined> {
  return (await cookies()).get(CSRF_COOKIE_NAME)?.value
}

export async function getCsrfToken(): Promise<string> {
  const store = await cookies()
  const existing = store.get(CSRF_COOKIE_NAME)?.value
  if (existing) return existing
  const token = generateCsrfToken()
  store.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
  return token
}

export async function csrfOk(request: Request): Promise<boolean> {
  const header = request.headers.get('x-csrf-token')
  const cookie = await readCsrfCookie()
  if (!header || !cookie || header.length !== cookie.length) return false
  return createHmac('sha256', cookie).update(header).digest() === createHmac('sha256', cookie).update(cookie).digest()
}

export function csrfError() {
  return { error: 'Invalid or missing CSRF token', status: 403 as const }
}