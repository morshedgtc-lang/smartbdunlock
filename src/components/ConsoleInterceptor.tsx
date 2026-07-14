'use client'

import { useEffect } from 'react'

const INTERCEPTOR_TAG = '[LOG_INTERCEPTOR]'

function sendLog(level: string, message: string, source: string) {
  if (message.includes(INTERCEPTOR_TAG)) return // avoid infinite loops
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
      origError.apply(console, args)
      const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
      sendLog('error', msg, 'console')
    }

    console.warn = (...args: any[]) => {
      origWarn.apply(console, args)
      const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
      sendLog('warn', msg, 'console')
    }

    return () => {
      console.error = origError
      console.warn = origWarn
    }
  }, [])

  return null
}
