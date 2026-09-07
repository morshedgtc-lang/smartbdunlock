import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { config as cfg } from '@/lib/config'

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  return ip
}

export function proxy(request: NextRequest) {
  try {
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')

    if (request.method === 'OPTIONS') {
      const preflight = new NextResponse(null, { status: 204 })
      preflight.headers.set('Access-Control-Allow-Origin', origin || '*')
      preflight.headers.set('Access-Control-Allow-Methods', cfg.cors.allowedMethods)
      preflight.headers.set('Access-Control-Allow-Headers', cfg.cors.allowedHeaders)
      preflight.headers.set('Access-Control-Max-Age', cfg.cors.maxAge)
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
      if (contentLength && parseInt(contentLength) > cfg.upload.maxFileSize) {
        return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
      }
    }

    // API v1 has its own per-key limiter; uploads/health are asset/ops endpoints —
    // only rate-limit general web traffic by IP.
    const pathname = request.nextUrl.pathname
    const shouldRateLimit =
      !pathname.startsWith('/api/v1/') &&
      !pathname.startsWith('/uploads/') &&
      pathname !== '/api/health'

    const key = getRateLimitKey(request)
    const now = Date.now()
    const entry = rateLimitMap.get(key)

    if (shouldRateLimit && (!entry || now > entry.resetTime)) {
      rateLimitMap.set(key, { count: 1, resetTime: now + cfg.rateLimit.globalWindowMs })
      response.headers.set('X-RateLimit-Limit', String(cfg.rateLimit.globalMax))
      response.headers.set('X-RateLimit-Remaining', String(cfg.rateLimit.globalMax - 1))
      response.headers.set('X-RateLimit-Reset', String(Math.ceil((now + cfg.rateLimit.globalWindowMs) / 1000)))
    } else if (shouldRateLimit) {
      entry!.count++
      const remaining = Math.max(0, cfg.rateLimit.globalMax - entry!.count)
      response.headers.set('X-RateLimit-Limit', String(cfg.rateLimit.globalMax))
      response.headers.set('X-RateLimit-Remaining', String(remaining))
      response.headers.set('X-RateLimit-Reset', String(Math.ceil(entry!.resetTime / 1000)))
      if (entry!.count > cfg.rateLimit.globalMax) {
        const retryAfter = Math.ceil((entry!.resetTime - now) / 1000)
        const tooMany = NextResponse.json({ error: 'Too many requests' }, { status: 429 })
        tooMany.headers.set('Retry-After', String(retryAfter))
        tooMany.headers.set('X-RateLimit-Limit', String(cfg.rateLimit.globalMax))
        tooMany.headers.set('X-RateLimit-Remaining', '0')
        return tooMany
      }
    }

    if (rateLimitMap.size > cfg.rateLimit.mapCleanupThreshold) {
      const cutoff = now - cfg.rateLimit.globalWindowMs
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
    response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';"
    )

    return response
  } catch {
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
