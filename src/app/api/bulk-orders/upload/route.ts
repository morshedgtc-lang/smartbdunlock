import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

interface ParsedImei {
  imei: string
  line: number
  valid: boolean
  duplicate: boolean
  error?: string
}

export async function POST(request: Request) {
  try {
    await requireAuth()
    const body = await request.json()
    const { fileContent, fileName } = body as { fileContent: string; fileName: string }

    if (!fileContent) return NextResponse.json({ error: 'File content is required' }, { status: 400 })
    if (!fileName) return NextResponse.json({ error: 'File name is required' }, { status: 400 })

    const ext = fileName.split('.').pop()?.toLowerCase()
    if (ext !== 'csv' && ext !== 'txt') return NextResponse.json({ error: 'Only CSV and TXT files are supported' }, { status: 400 })

    let decoded: string
    try {
      if (fileContent.includes('base64,')) {
        decoded = Buffer.from(fileContent.split('base64,')[1], 'base64').toString('utf-8')
      } else {
        decoded = Buffer.from(fileContent, 'base64').toString('utf-8')
      }
    } catch {
      return NextResponse.json({ error: 'Failed to decode file' }, { status: 400 })
    }

    const lines = decoded.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean)
    const seen = new Set<string>()
    const results: ParsedImei[] = []

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i].replace(/[^0-9]/g, '')
      const isDuplicate = seen.has(raw)
      if (!isDuplicate) seen.add(raw)

      if (raw.length !== 15) {
        results.push({ imei: raw, line: i + 1, valid: false, duplicate: false, error: `IMEI must be exactly 15 digits (got ${raw.length})` })
      } else if (isDuplicate) {
        results.push({ imei: raw, line: i + 1, valid: true, duplicate: true, error: 'Duplicate IMEI' })
      } else {
        results.push({ imei: raw, line: i + 1, valid: true, duplicate: false })
      }
    }

    const valid = results.filter(r => r.valid && !r.duplicate)
    const invalid = results.filter(r => !r.valid)
    const duplicates = results.filter(r => r.duplicate)

    return NextResponse.json({
      total: results.length,
      validCount: valid.length,
      invalidCount: invalid.length,
      duplicateCount: duplicates.length,
      imeis: valid.map(r => r.imei),
      errors: [...invalid, ...duplicates].map(r => ({
        imei: r.imei,
        line: r.line,
        error: r.error,
      })),
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    console.error('BulkUpload POST error:', error)
    return NextResponse.json({ error: 'Failed to parse file' }, { status: 500 })
  }
}
