import { prisma } from '@/lib/prisma'
import { processJob } from './processor'
import { triggerFailover } from './failover'

export async function pollPendingJobs() {
  const jobs = await prisma.supplierJob.findMany({
    where: { status: { in: ['queued', 'processing'] } },
    include: { order: true, supplier: true },
    orderBy: { createdAt: 'asc' },
    take: 50,
  })

  const results = { processed: 0, completed: 0, failed: 0, pending: 0 }

  for (const job of jobs) {
    results.processed++

    if (job.status === 'queued') {
      const { submitToSupplier } = await import('./processor')
      const submitted = await submitToSupplier(job.id)
      if (!submitted) {
        results.failed++
        await triggerFailover(job.orderId, job.supplierId)
      }
      continue
    }

    if (job.status === 'processing') {
      const result = await processJob(job.id)
      if (result && 'status' in result && result.status === 'completed') {
        results.completed++
      } else if (result && 'status' in result && result.status === 'failed') {
        results.failed++
        await triggerFailover(job.orderId, job.supplierId)
      } else {
        results.pending++
      }
    }
  }

  return results
}
