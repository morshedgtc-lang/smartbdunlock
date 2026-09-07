import { prisma } from '@/lib/prisma'
import { getFailoverChain } from './router'
import { createSupplierJob, submitToSupplier } from './processor'
import { createNotification } from '@/lib/notifications'
import { auditLog } from '@/lib/audit'
import { enqueueWebhookEvent } from '@/lib/webhooks'

export async function triggerFailover(orderId: string, failedSupplierId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) return null

  const chain = await getFailoverChain(orderId, failedSupplierId)
  if (chain.length === 0) {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'failed', result: JSON.stringify({ error: 'All suppliers failed' }) },
    })

    await enqueueWebhookEvent({
      userId: order.userId,
      event: 'order.failed',
      orderId,
    })

    await createNotification({
      userId: order.userId,
      title: 'Order Failed',
      message: `Order ${order.orderNumber} has failed. All suppliers exhausted.`,
      type: 'error',
      link: '/orders',
    })

    await createNotification({
      userId: order.userId,
      title: 'Supplier Failover Exhausted',
      message: `All suppliers failed for order ${order.orderNumber}. Manual intervention required.`,
      type: 'warning',
      link: '/admin/orders',
    })

    await auditLog({
      action: 'supplier_job.failover_exhausted',
      entityType: 'supplier_job',
      entityId: orderId,
      newValues: { orderNumber: order.orderNumber, failedSupplierId },
    })

    return null
  }

  const nextSupplierId = chain[0]
  const nextSupplier = await prisma.supplier.findUnique({ where: { id: nextSupplierId } })

  const job = await createSupplierJob({
    orderId,
    supplierId: nextSupplierId,
    requestPayload: JSON.stringify({ failoverFrom: failedSupplierId, attempt: 'failover' }),
  })

  const submitted = await submitToSupplier(job.id)

  await auditLog({
    action: 'supplier_job.failover',
    entityType: 'supplier_job',
    entityId: job.id,
    newValues: {
      orderId,
      from: failedSupplierId,
      to: nextSupplierId,
      toName: nextSupplier?.name,
      submitted: !!submitted,
    },
  })

  if (nextSupplier) {
    await createNotification({
      userId: order.userId,
      title: 'Supplier Failover',
      message: `Order ${order.orderNumber} rerouted to ${nextSupplier.name}.`,
      type: 'warning',
      link: '/admin/orders',
    })
  }

  return job
}
