import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'

const DEFAULTS: Record<string, string> = {
  platformName: 'SmartBD Unlock',
  supportEmail: 'support@smartbdunlock.com',
  currency: 'USD',
  platformDescription: '',
  maintenanceMode: 'false',
}

export async function GET() {
  try {
    await requireAdmin()

    const rows = await prisma.systemSetting.findMany({
      select: { key: true, value: true },
    })

    const stored: Record<string, string> = {}
    for (const row of rows) {
      stored[row.key] = row.value
    }

    const settings: Record<string, string> = { ...DEFAULTS, ...stored }
    return NextResponse.json(settings)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown'
    if (msg === 'Unauthorized') return NextResponse.json({ error: msg }, { status: 401 })
    if (msg === 'Forbidden') return NextResponse.json({ error: msg }, { status: 403 })
    console.error('Settings GET error:', error)
    return NextResponse.json({ ...DEFAULTS })
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()

    const body = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const allowedKeys = Object.keys(DEFAULTS)
    const entries: Array<{ key: string; value: string }> = []

    for (const key of allowedKeys) {
      if (key in body) {
        entries.push({ key, value: String(body[key]) })
      }
    }

    if (entries.length === 0) {
      return NextResponse.json({ error: 'No valid settings provided' }, { status: 400 })
    }

    for (const { key, value } of entries) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    }

    const oldValues: Record<string, string> = {}
    for (const { key } of entries) {
      oldValues[key] = '(changed)'
    }

    await auditLog({
      userId: admin.id,
      userEmail: admin.email,
      action: 'settings.update',
      entityType: 'system_settings',
      newValues: Object.fromEntries(entries.map((e) => [e.key, e.value])),
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    const rows = await prisma.systemSetting.findMany({
      select: { key: true, value: true },
    })
    const stored: Record<string, string> = {}
    for (const row of rows) {
      stored[row.key] = row.value
    }

    return NextResponse.json({ ...DEFAULTS, ...stored })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown'
    if (msg === 'Unauthorized') return NextResponse.json({ error: msg }, { status: 401 })
    if (msg === 'Forbidden') return NextResponse.json({ error: msg }, { status: 403 })
    console.error('Settings POST error:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
