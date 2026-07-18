import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'

const MAX_FILE_SIZE = 10 * 1024 * 1024
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
    const files: File[] = []
    const purpose = (formData.get('purpose') as string) || 'general'

    for (const [key, value] of formData.entries()) {
      if (value instanceof File && key === 'file') {
        files.push(value)
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    if (files.length > 5) {
      return NextResponse.json({ error: 'Maximum 5 files per upload' }, { status: 400 })
    }

    const results: { url: string; name: string; originalName: string; type: string; size: number }[] = []
    const errors: string[] = []

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: exceeds 10MB limit`)
        continue
      }

      if (!ALLOWED_TYPES.has(file.type)) {
        errors.push(`${file.name}: file type not allowed`)
        continue
      }

      const extension = file.name.split('.').pop() || 'bin'
      const randomFilename = `${crypto.randomUUID()}.${extension}`
      const buffer = Buffer.from(await file.arrayBuffer())
      const base64 = buffer.toString('base64')
      const dataUrl = `data:${file.type};base64,${base64}`

      await auditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'file.upload',
        entityType: 'file',
        entityId: randomFilename,
        newValues: { filename: randomFilename, originalName: file.name, type: file.type, size: file.size, purpose },
        ip: getClientIp(request),
        userAgent: getClientUserAgent(request),
      })

      results.push({
        url: dataUrl,
        name: randomFilename,
        originalName: file.name,
        type: file.type,
        size: file.size,
      })
    }

    if (results.length === 0 && errors.length > 0) {
      return NextResponse.json({ error: 'All files rejected', details: errors }, { status: 400 })
    }

    return NextResponse.json({
      files: results,
      errors: errors.length > 0 ? errors : undefined,
      purpose,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
