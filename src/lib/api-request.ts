import { prisma } from '@/lib/prisma'
import { getClientIp } from '@/lib/audit'
import { errorResponse } from '@/lib/api-response'
import type { NextResponse } from 'next/server'

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{5,63}$/

export function getRequestId(request: Request): string {
  const header = request.headers.get('x-request-id')
  if (header && REQUEST_ID_PATTERN.test(header)) return header
  return crypto.randomUUID()
}

export function setRequestIdHeader(request: Request, response: NextResponse) {
  response.headers.set('X-Request-ID', getRequestId(request))
  return response
}

interface LogApiRequestParams {
  requestId: string
  keyId?: string | null
  userId?: string | null
  endpoint: string
  method: string
  statusCode?: number | null
  durationMs?: number | null
  errorCode?: string | null
  externalId?: string | null
  ip?: string | null
}

export async function logApiRequest(params: LogApiRequestParams) {
  try {
    await prisma.apiRequestLog.create({
      data: {
        id: crypto.randomUUID(),
        requestId: params.requestId,
        keyId: params.keyId || null,
        userId: params.userId || null,
        endpoint: params.endpoint,
        method: params.method,
        statusCode: params.statusCode ?? null,
        durationMs: params.durationMs ?? null,
        errorCode: params.errorCode || null,
        externalId: params.externalId || null,
        ip: params.ip || null,
      },
    })
  } catch (err) {
    console.error('ApiRequestLog write failed:', err)
  }
}

export function withApiLogging(request: Request, options: {
  keyId?: string | null
  userId?: string | null
  externalId?: string | null
}) {
  const requestId = getRequestId(request)
  const started = Date.now()
  const url = new URL(request.url)
  const endpoint = `${url.pathname}${url.search ? '?' + url.search : ''}`

  return {
    requestId,
    async finish(response: NextResponse, extra?: { externalId?: string | null; errorCode?: string | null }) {
      await logApiRequest({
        requestId,
        keyId: options.keyId ?? null,
        userId: options.userId ?? null,
        endpoint,
        method: request.method,
        statusCode: response.status,
        durationMs: Date.now() - started,
        errorCode: extra?.errorCode ?? null,
        externalId: extra?.externalId ?? options.externalId ?? null,
        ip: getClientIp(request) === 'unknown' ? null : getClientIp(request),
      })
      response.headers.set('X-Request-ID', requestId)
      return response
    },
  }
}

export async function apiError(error: unknown, message: string, status: number) {
  console.error(`${message}:`, error)
  return errorResponse(message, 'INTERNAL_ERROR', status)
}