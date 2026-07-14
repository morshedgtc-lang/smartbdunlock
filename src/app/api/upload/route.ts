import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain', 'text/csv',
  'application/json',
])

export async function POST(request: Request) {
  try {
    const user = await requireAuth()

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 413 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'file.upload',
      entityType: 'file',
      newValues: { filename: file.name, type: file.type, size: file.size },
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({
      url: dataUrl,
      name: file.name,
      type: file.type,
      size: file.size,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
