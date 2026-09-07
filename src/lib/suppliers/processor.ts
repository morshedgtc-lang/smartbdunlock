import { prisma } from '@/lib/prisma'
import { getAdapter } from './router'
import { createNotification } from '@/lib/notifications'
import { auditLog } from '@/lib/audit'
import { enqueueWebhookEvent } from '@/lib/webhooks'

export async function createSupplierJob(params: {
  orderId: string
  supplierId: string
  requestPayload?: string
}) {
  const job = await prisma.supplierJob.create({
    data: {
      id: crypto.randomUUID(),
      orderId: params.orderId,
      supplierId: params.supplierId,
      requestPayload: params.requestPayload || null,
    },
  })

  await auditLog({
    action: 'supplier_job.create',
    entityType: 'supplier_job',
    entityId: job.id,
    newValues: { orderId: params.orderId, supplierId: params.supplierId },
  })

  return job
}

export async function submitToSupplier(jobId: string) {
  const job = await prisma.supplierJob.findUnique({
    where: { id: jobId },
    include: { order: true, supplier: true },
  })
  if (!job || !job.order || !job.supplier) return null

  const adapter = getAdapter(job.supplier.type)

  try {
    const response = await adapter.submitOrder({
      orderId: job.orderId,
      orderNumber: job.order.orderNumber,
      imei: job.order.imei || undefined,
      deviceInfo: job.order.deviceInfo || undefined,
      serviceType: 'unlock',
      payload: job.requestPayload || undefined,
    })

    if (response.success) {
      await prisma.supplierJob.update({
        where: { id: jobId },
        data: {
          status: 'processing',
          externalOrderId: response.externalOrderId || null,
          responsePayload: response.rawResponse || null,
          attempts: { increment: 1 },
          lastAttemptAt: new Date(),
        },
      })

      await prisma.order.update({
        where: { id: job.orderId },
        data: { status: 'processing' },
      })

      await enqueueWebhookEvent({
        userId: job.order.userId,
        event: 'order.processing',
        orderId: job.orderId,
      })

      await auditLog({
        action: 'supplier_job.submit',
        entityType: 'supplier_job',
        entityId: jobId,
        newValues: { externalOrderId: response.externalOrderId, status: 'processing' },
      })

      return response
    } else {
      await prisma.supplierJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          responsePayload: response.rawResponse || response.message || null,
          attempts: { increment: 1 },
          lastAttemptAt: new Date(),
        },
      })

      return null
    }
  } catch (err) {
    await prisma.supplierJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        responsePayload: JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    })
    return null
  }
}

export async function processJob(jobId: string) {
  const job = await prisma.supplierJob.findUnique({
    where: { id: jobId },
    include: { order: true, supplier: true },
  })
  if (!job || !job.order || !job.supplier) return null

  const adapter = getAdapter(job.supplier.type)

  if (!job.externalOrderId) {
    return submitToSupplier(jobId)
  }

  try {
    const status = await adapter.checkStatus(job.externalOrderId)

    if (status.status === 'completed') {
      await prisma.$transaction(async (tx) => {
        await tx.supplierJob.update({
          where: { id: jobId },
          data: { status: 'completed', completedAt: new Date(), responsePayload: status.result || null },
        })

        await tx.order.update({
          where: { id: job.orderId },
          data: { status: 'completed', completedAt: new Date(), result: status.result || null },
        })

        if (job.order.supplierId) {
          await tx.supplier.update({
            where: { id: job.order.supplierId },
            data: { totalOrders: { increment: 1 } },
          })
        }
      })

      await createNotification({
        userId: job.order.userId,
        title: 'Order Completed',
        message: `Order ${job.order.orderNumber} has been completed successfully!`,
        type: 'success',
        link: '/orders',
      })

      await auditLog({
        action: 'supplier_job.complete',
        entityType: 'supplier_job',
        entityId: jobId,
        newValues: { orderId: job.orderId, externalOrderId: job.externalOrderId },
      })

      await enqueueWebhookEvent({
        userId: job.order.userId,
        event: 'order.completed',
        orderId: job.orderId,
      })

      return status
    }

    if (status.status === 'failed') {
      await prisma.supplierJob.update({
        where: { id: jobId },
        data: { status: 'failed', responsePayload: status.result || status.message || null },
      })

      return status
    }

    return status
  } catch (err) {
    await prisma.supplierJob.update({
      where: { id: jobId },
      data: {
        responsePayload: JSON.stringify({ error: err instanceof Error ? err.message : 'Poll error' }),
      },
    })
    return null
  }
}
