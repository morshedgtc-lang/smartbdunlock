'use client'

import { useState, useEffect, useCallback } from 'react'

interface UseApiOptions<T> {
  url: string
  method?: string
  body?: any
  enabled?: boolean
  initialData?: T
}

interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useApi<T = any>({ url, method = 'GET', body, enabled, initialData }: UseApiOptions<T>): UseApiResult<T> {
  // Never auto-fire non-GET requests on mount — mutations must be triggered
  // explicitly via refetch() or a dedicated action. Defaults to enabled for
  // GET, disabled otherwise.
  const shouldFetch = enabled ?? method === 'GET'
  const [data, setData] = useState<T | null>(initialData ?? null)
  const [loading, setLoading] = useState(shouldFetch)
  const [error, setError] = useState<string | null>(null)
  const [trigger, setTrigger] = useState(0)

  const refetch = useCallback(() => setTrigger(t => t + 1), [])

  useEffect(() => {
    if (!shouldFetch) {
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const opts: RequestInit = {
          method,
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
        }
        if (body && method !== 'GET') {
          opts.body = JSON.stringify(body)
        }
        const res = await fetch(url, opts)
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Request failed' }))
          throw new Error(err.error || `HTTP ${res.status}`)
        }
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch (e: any) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [url, method, trigger, shouldFetch])

  return { data, loading, error, refetch }
}

