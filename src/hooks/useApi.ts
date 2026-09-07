'use client'

import { useState, useEffect, useCallback } from 'react'
import { ensureCsrf, readCsrfFromCookie } from '@/lib/csrf-client'

interface UseApiOptions<T> {
  url: string
  method?: string
  body?: unknown
  enabled?: boolean
  initialData?: T
}

interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

let sessionCheckedAt = 0
let sessionCachedValid = false
const SESSION_CACHE_TTL = 30_000

async function checkSession(): Promise<boolean> {
  const now = Date.now()
  if (now - sessionCheckedAt < SESSION_CACHE_TTL) return sessionCachedValid
  try {
    const res = await fetch('/api/auth/session', { credentials: 'same-origin' })
    sessionCachedValid = res.ok
  } catch {
    sessionCachedValid = false
  }
  sessionCheckedAt = now
  return sessionCachedValid
}

export function useApi<T = Record<string, unknown>>({ url, method = 'GET', body, enabled, initialData }: UseApiOptions<T>): UseApiResult<T> {
  const shouldFetch = enabled ?? method === 'GET'
  const [data, setData] = useState<T | null>(initialData ?? null)
  const [loading, setLoading] = useState(shouldFetch)
  const [error, setError] = useState<string | null>(null)
  const [trigger, setTrigger] = useState(0)

  const refetch = useCallback(() => setTrigger(t => t + 1), [])
  const bodyKey = body ? JSON.stringify(body) : undefined

  useEffect(() => {
    if (!shouldFetch) {
      setLoading(false)
      return
    }

    let cancelled = false

    const doFetch = async (retryCount: number): Promise<void> => {
      try {
        const opts: RequestInit = {
          method,
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
        }
        if (method !== 'GET') {
          const csrf = readCsrfFromCookie() || (await ensureCsrf())
          if (csrf) {
            ;(opts.headers as Record<string, string>)['X-CSRF-Token'] = csrf
          }
        }
        if (bodyKey && method !== 'GET') {
          opts.body = bodyKey
        }
        const res = await fetch(url, opts)

        if (res.status === 401) {
          if (url === '/api/auth/session') {
            if (!cancelled) {
              setError('Unauthorized')
              setLoading(false)
            }
            return
          }

          if (retryCount === 0) {
            const valid = await checkSession()

            if (valid) {
              await new Promise(r => setTimeout(r, 300))
              if (!cancelled) await doFetch(1)
              return
            }
          }

          throw new Error('Unauthorized')
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Request failed' }))
          throw new Error(err.error || `HTTP ${res.status}`)
        }
        const json = await res.json()
        if (!cancelled) {
          setData(json)
          setError(null)
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Request failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    setLoading(true)
    setError(null)
    doFetch(0)

    return () => { cancelled = true }
  }, [url, method, trigger, shouldFetch, bodyKey])

  return { data, loading, error, refetch }
}
