import { prisma } from '@/lib/prisma'
import { getAdapter } from './router'
import { decryptApiKey } from '@/lib/crypto'
import { logger } from '@/lib/logger'

interface SyncResult {
  providerId: string
  totalImported: number
  newServices: number
  updatedServices: number
  failedServices: number
  status: 'success' | 'partial' | 'failed'
  error?: string
  duration: number
}

export async function syncProviderServices(providerId: string): Promise<SyncResult> {
  const startTime = Date.now()

  const provider = await prisma.supplier.findUnique({ where: { id: providerId } })
  if (!provider) {
    return { providerId, totalImported: 0, newServices: 0, updatedServices: 0, failedServices: 0, status: 'failed', error: 'Provider not found', duration: 0 }
  }

  if (provider.status !== 'active') {
    return { providerId, totalImported: 0, newServices: 0, updatedServices: 0, failedServices: 0, status: 'failed', error: 'Provider is not active', duration: 0 }
  }

  const config = parseConfig(provider.config)
  const apiUrl = config?.apiUrl || ''
  const encryptedKey = provider.apiKeyEncrypted || provider.apiKey

  if (!apiUrl || !encryptedKey) {
    return { providerId, totalImported: 0, newServices: 0, updatedServices: 0, failedServices: 0, status: 'failed', error: 'Missing API URL or API key', duration: 0 }
  }

  let apiKey: string
  try {
    apiKey = decryptApiKey(encryptedKey)
  } catch {
    apiKey = encryptedKey
  }

  const adapter = getAdapter(provider.type)
  let rawServices: Awaited<ReturnType<typeof adapter.getServices>> = []

  try {
    rawServices = await adapter.getServices(apiUrl, apiKey)
  } catch (err) {
    const duration = Date.now() - startTime
    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch services'

    await logSyncHistory(providerId, { totalImported: 0, newServices: 0, updatedServices: 0, failedServices: 0, status: 'failed', error: errorMsg, duration })

    return { providerId, totalImported: 0, newServices: 0, updatedServices: 0, failedServices: 0, status: 'failed', error: errorMsg, duration }
  }

  let newCount = 0
  let updatedCount = 0
  let failedCount = 0

  for (const svc of rawServices) {
    try {
      if (!svc.serviceId) { failedCount++; continue }

      const existing = await prisma.supplierService.findUnique({
        where: { providerId_supplierServiceId: { providerId, supplierServiceId: svc.serviceId } },
      })

      if (existing) {
        const needsUpdate = existing.supplierCost !== svc.cost || existing.name !== svc.name
        if (needsUpdate) {
          await prisma.supplierService.update({
            where: { id: existing.id },
            data: {
              name: svc.name,
              category: svc.category || existing.category,
              supplierCost: svc.cost,
              currency: svc.currency || existing.currency,
              deliveryTime: svc.deliveryTime || existing.deliveryTime,
              requiredInputs: svc.requiredInputs ? JSON.stringify(svc.requiredInputs) : existing.requiredInputs,
              rawData: svc.rawData ? JSON.stringify(svc.rawData) : existing.rawData,
            },
          })
          updatedCount++
        }
      } else {
        await prisma.supplierService.create({
          data: {
            providerId,
            supplierServiceId: svc.serviceId,
            name: svc.name,
            category: svc.category || null,
            supplierCost: svc.cost,
            currency: svc.currency || 'USD',
            deliveryTime: svc.deliveryTime || null,
            requiredInputs: svc.requiredInputs ? JSON.stringify(svc.requiredInputs) : null,
            rawData: svc.rawData ? JSON.stringify(svc.rawData) : null,
            status: 'pending',
          },
        })
        newCount++
      }
    } catch {
      failedCount++
    }
  }

  const totalImported = rawServices.length
  const duration = Date.now() - startTime
  const status = failedCount === totalImported ? 'failed' : failedCount > 0 ? 'partial' : 'success'

  await prisma.supplier.update({
    where: { id: providerId },
    data: { lastSyncAt: new Date() },
  })

  await logSyncHistory(providerId, { totalImported, newServices: newCount, updatedServices: updatedCount, failedServices: failedCount, status, duration })

  await logger.info(`Sync completed for ${provider.name}: ${newCount} new, ${updatedCount} updated, ${failedCount} failed`, { source: 'sync-engine' })

  return { providerId, totalImported, newServices: newCount, updatedServices: updatedCount, failedServices: failedCount, status, duration }
}

export async function calculateSellingPrice(params: {
  supplierCost: number
  providerId?: string
  category?: string
  serviceOverride?: { profitType: string; profitValue: number }
}): Promise<number> {
  const { supplierCost, providerId, category, serviceOverride } = params

  if (serviceOverride && serviceOverride.profitValue > 0) {
    if (serviceOverride.profitType === 'percentage') {
      return Math.round(supplierCost * (1 + serviceOverride.profitValue / 100) * 100) / 100
    }
    return Math.round((supplierCost + serviceOverride.profitValue) * 100) / 100
  }

  if (category) {
    const categoryRule = await prisma.pricingRule.findFirst({
      where: { type: 'category', category, active: true },
      orderBy: { createdAt: 'desc' },
    })
    if (categoryRule) {
      if (categoryRule.type === 'percentage') {
        return Math.round(supplierCost * (1 + categoryRule.value / 100) * 100) / 100
      }
      return Math.round((supplierCost + categoryRule.value) * 100) / 100
    }
  }

  if (providerId) {
    const supplierRule = await prisma.pricingRule.findFirst({
      where: { type: 'supplier', providerId, active: true },
    })
    if (supplierRule) {
      if (supplierRule.type === 'percentage') {
        return Math.round(supplierCost * (1 + supplierRule.value / 100) * 100) / 100
      }
      return Math.round((supplierCost + supplierRule.value) * 100) / 100
    }
  }

  const globalRule = await prisma.pricingRule.findFirst({
    where: { type: 'fixed', active: true },
    orderBy: { createdAt: 'desc' },
  })
  if (globalRule) {
    return Math.round((supplierCost + globalRule.value) * 100) / 100
  }

  return Math.round(supplierCost * 1.1 * 100) / 100
}

async function logSyncHistory(providerId: string, data: {
  totalImported: number
  newServices: number
  updatedServices: number
  failedServices: number
  status: string
  error?: string
  duration: number
}) {
  try {
    await prisma.syncHistory.create({
      data: {
        providerId,
        totalImported: data.totalImported,
        newServices: data.newServices,
        updatedServices: data.updatedServices,
        failedServices: data.failedServices,
        status: data.status,
        error: data.error || null,
        duration: data.duration,
      },
    })
  } catch (err) {
    console.error('Failed to log sync history:', err)
  }
}

function parseConfig(config: string | null): Record<string, unknown> | null {
  if (!config) return null
  try {
    const parsed = JSON.parse(config)
    return typeof parsed === 'object' && parsed !== null ? parsed : null
  } catch {
    return null
  }
}
