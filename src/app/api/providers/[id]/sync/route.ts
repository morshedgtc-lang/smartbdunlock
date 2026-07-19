import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { syncProviderServices } from '@/lib/suppliers/sync-engine'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const result = await syncProviderServices(id)

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'provider.sync',
      entityType: 'supplier',
      entityId: id,
      newValues: { newServices: result.newServices, updatedServices: result.updatedServices, failedServices: result.failedServices, status: result.status, duration: result.duration },
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Provider sync error:', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
