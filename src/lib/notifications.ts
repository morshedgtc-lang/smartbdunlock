import { prisma } from '@/lib/prisma'

interface CreateNotificationParams {
  userId: string
  title: string
  message: string
  type?: string
  link?: string
}

export async function createNotification({
  userId,
  title,
  message,
  type = 'info',
  link,
}: CreateNotificationParams) {
  try {
    await prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        title,
        message,
        type,
        link: link || null,
      },
    })
  } catch (err) {
    console.error('Failed to create notification:', err)
  }
}

export async function createOrderNotification(order: {
  id: string
  orderNumber: string
  status: string
  serviceName?: string
  userId: string
}) {
  const statusMessages: Record<string, { title: string; message: string; type: string }> = {
    pending: { title: 'New Order Created', message: `Order ${order.orderNumber} (${order.serviceName || 'Service'}) has been submitted.`, type: 'info' },
    processing: { title: 'Order Processing', message: `Order ${order.orderNumber} is now being processed.`, type: 'info' },
    completed: { title: 'Order Completed', message: `Order ${order.orderNumber} has been completed successfully!`, type: 'success' },
    failed: { title: 'Order Failed', message: `Order ${order.orderNumber} has failed. Please contact support.`, type: 'error' },
    cancelled: { title: 'Order Cancelled', message: `Order ${order.orderNumber} has been cancelled.`, type: 'warning' },
  }

  const notification = statusMessages[order.status]
  if (notification) {
    await createNotification({
      userId: order.userId,
      ...notification,
      link: `/orders?order=${order.id}`,
    })
  }
}

export async function createWalletNotification(userId: string, type: string, amount: number, description?: string) {
  const messages: Record<string, { title: string; message: string; notifType: string }> = {
    deposit: { title: 'Funds Deposited', message: `$${amount.toFixed(2)} has been added to your wallet. ${description || ''}`, notifType: 'success' },
    withdraw: { title: 'Funds Withdrawn', message: `$${amount.toFixed(2)} has been withdrawn from your wallet. ${description || ''}`, notifType: 'info' },
    transfer: { title: 'Transfer Completed', message: `$${amount.toFixed(2)} has been transferred. ${description || ''}`, notifType: 'info' },
    order_payment: { title: 'Payment Processed', message: `$${amount.toFixed(2)} has been deducted for your order. ${description || ''}`, notifType: 'info' },
    order_refund: { title: 'Refund Received', message: `$${amount.toFixed(2)} has been refunded to your wallet. ${description || ''}`, notifType: 'success' },
  }

  const msg = messages[type]
  if (msg) {
    await createNotification({
      userId,
      title: msg.title,
      message: msg.message,
      type: msg.notifType,
      link: '/wallet',
    })
  }
}
