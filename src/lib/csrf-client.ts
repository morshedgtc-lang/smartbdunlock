'use client'

const CSRF_COOKIE_NAME = 'sbdu_csrf'

let csrfPromise: Promise<string> | null = null

export function readCsrfFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`))
  return match ? match.slice(CSRF_COOKIE_NAME.length + 1) : null
}

export function ensureCsrf(): Promise<string> {
  const existing = readCsrfFromCookie()
  if (existing) return Promise.resolve(existing)
  if (!csrfPromise) {
    csrfPromise = fetch('/api/auth/csrf', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to obtain CSRF token'))))
      .then((json) => {
        csrfPromise = null
        return readCsrfFromCookie() || json?.csrfToken || ''
      })
      .catch((err) => {
        csrfPromise = null
        throw err
      })
  }
  return csrfPromise
}

export async function csrfFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method || 'GET').toUpperCase()
  if (method === 'GET' || method === 'HEAD') {
    return fetch(url, { ...init, credentials: 'same-origin' })
  }
  const token = await ensureCsrf()
  const headers = new Headers(init.headers || {})
  headers.set('X-CSRF-Token', token)
  return fetch(url, { ...init, credentials: 'same-origin', headers })
}