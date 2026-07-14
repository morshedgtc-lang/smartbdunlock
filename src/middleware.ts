import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000
const RATE_LIMIT_MAX = 100

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  return ip
}

export function middleware(request: NextRequest) {
  try {
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')

    if (request.method === 'OPTIONS') {
      const preflight = new NextResponse(null, { status: 204 })
      preflight.headers.set('Access-Control-Allow-Origin', origin || '*')
      preflight.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
      preflight.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      preflight.headers.set('Access-Control-Max-Age', '86400')
      return preflight
    }

    const response = NextResponse.next()

    if (origin && host) {
      const originUrl = new URL(origin)
      if (originUrl.hostname === host) {
        response.headers.set('Access-Control-Allow-Origin', origin)
      }
    }
    response.headers.set('Access-Control-Allow-Credentials', 'true')

    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const contentLength = request.headers.get('content-length')
      if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'Request body too large (max 5MB)' }, { status: 413 })
      }
    }

    const key = getRateLimitKey(request)
    const now = Date.now()
    const entry = rateLimitMap.get(key)

    if (!entry || now > entry.resetTime) {
      rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
      response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX))
      response.headers.set('X-RateLimit-Remaining', String(RATE_LIMIT_MAX - 1))
      response.headers.set('X-RateLimit-Reset', String(Math.ceil((now + RATE_LIMIT_WINDOW) / 1000)))
    } else {
      entry.count++
      const remaining = Math.max(0, RATE_LIMIT_MAX - entry.count)
      response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX))
      response.headers.set('X-RateLimit-Remaining', String(remaining))
      response.headers.set('X-RateLimit-Reset', String(Math.ceil(entry.resetTime / 1000)))
      if (entry.count > RATE_LIMIT_MAX) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
        const tooMany = NextResponse.json({ error: 'Too many requests' }, { status: 429 })
        tooMany.headers.set('Retry-After', String(retryAfter))
        tooMany.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX))
        tooMany.headers.set('X-RateLimit-Remaining', '0')
        return tooMany
      }
    }

    if (rateLimitMap.size > 10000) {
      const cutoff = now - RATE_LIMIT_WINDOW
      for (const [k, v] of rateLimitMap) {
        if (v.resetTime < cutoff) rateLimitMap.delete(k)
      }
    }

    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';"
    )

    return response
  } catch {
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
