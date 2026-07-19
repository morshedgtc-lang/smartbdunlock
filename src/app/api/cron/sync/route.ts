import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncProviderServices } from '@/lib/suppliers/sync-engine'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const providers = await prisma.supplier.findMany({
      where: { status: 'active', type: 'api' },
    })

    const results = []

    for (const provider of providers) {
      const interval = provider.syncInterval || 10
      const lastSync = provider.lastSyncAt
      const now = new Date()
      const minutesSinceLastSync = lastSync ? (now.getTime() - lastSync.getTime()) / 60000 : Infinity

      if (minutesSinceLastSync < interval) {
        results.push({ providerId: provider.id, name: provider.name, skipped: true, reason: `Last sync ${Math.round(minutesSinceLastSync)}m ago (interval: ${interval}m)` })
        continue
      }

      try {
        const result = await syncProviderServices(provider.id)
        results.push({ providerId: provider.id, name: provider.name, ...result })
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        await logger.error(`Cron sync failed for ${provider.name}: ${errorMsg}`, { source: 'cron-sync' })
        results.push({ providerId: provider.id, name: provider.name, status: 'failed', error: errorMsg })
      }
    }

    return NextResponse.json({ synced: results.length, results })
  } catch (error: unknown) {
    console.error('Cron sync error:', error)
    return NextResponse.json({ error: 'Cron sync failed' }, { status: 500 })
  }
}
