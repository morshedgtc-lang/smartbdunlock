import { NextResponse } from 'next/server'

export function okResponse(data: unknown, meta?: Record<string, unknown>) {
  return NextResponse.json(
    meta ? { success: true, data, meta } : { success: true, data },
  )
}

export function errorResponse(
  message: string,
  code: string,
  status: number,
): NextResponse {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status },
  )
}