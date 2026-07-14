'use client'

import { useEffect } from 'react'

const INTERCEPTOR_TAG = '[LOG_INTERCEPTOR]'

function safeStringify(a: any): string {
  if (typeof a === 'string') return a
  try {
    const seen = new WeakSet()
    return JSON.stringify(a, (_key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]'
        seen.add(value)
      }
      return value
    })
  } catch {
    return String(a)
  }
}

function sendLog(level: string, message: string, source: string) {
  if (message.includes(INTERCEPTOR_TAG)) return
  try {
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, message: message.slice(0, 1000), source }),
    }).catch(() => {})
  } catch {}
}

export function ConsoleInterceptor() {
  useEffect(() => {
    const origError = console.error
    const origWarn = console.warn

    console.error = (...args: any[]) => {
      try {
        origError.apply(console, args)
        const msg = args.map(safeStringify).join(' ')
        sendLog('error', msg, 'console')
      } catch {
        origError.apply(console, args)
      }
    }

    console.warn = (...args: any[]) => {
      try {
        origWarn.apply(console, args)
        const msg = args.map(safeStringify).join(' ')
        sendLog('warn', msg, 'console')
      } catch {
        origWarn.apply(console, args)
      }
    }

    return () => {
      console.error = origError
      console.warn = origWarn
    }
  }, [])

  return null
}
