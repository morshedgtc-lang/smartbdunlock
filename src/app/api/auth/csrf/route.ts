import { NextResponse } from 'next/server'
import { getCsrfToken } from '@/lib/csrf'

export async function GET() {
  return NextResponse.json({ csrfToken: await getCsrfToken() })
}

export async function POST() {
  return NextResponse.json({ csrfToken: await getCsrfToken() })
}