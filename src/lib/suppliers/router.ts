import { prisma } from '@/lib/prisma'
import type { SupplierAdapter } from './base'
import { MockSupplierAdapter } from './mock'
import { ManualSupplierAdapter } from './manual'
import { GenericApiAdapter } from './generic-api'

const adapters = new Map<string, SupplierAdapter>([
  ['mock', new MockSupplierAdapter()],
  ['manual', new ManualSupplierAdapter()],
  ['api', new GenericApiAdapter()],
])

export function getAdapter(supplierType: string): SupplierAdapter {
  return adapters.get(supplierType) || new ManualSupplierAdapter()
}

export async function selectBestSupplier(serviceId: string): Promise<string | null> {
  const service = await prisma.service.findUnique({ where: { id: serviceId } })
  if (!service?.supplierId) return null

  const supplier = await prisma.supplier.findUnique({ where: { id: service.supplierId } })
  if (!supplier || supplier.status !== 'active') return null

  return supplier.id
}

export async function getFailoverChain(orderId: string, currentSupplierId: string): Promise<string[]> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { service: true } })
  if (!order?.service) return []

  const allSuppliers = await prisma.supplier.findMany({
    where: { status: 'active' },
    orderBy: [{ priority: 'asc' }, { successRate: 'desc' }],
  })

  const existingJobs = await prisma.supplierJob.findMany({ where: { orderId } })
  const triedSupplierIds = new Set(existingJobs.map(j => j.supplierId))

  return allSuppliers
    .filter(s => s.id !== currentSupplierId && !triedSupplierIds.has(s.id) && s.successRate >= 50)
    .map(s => s.id)
}
