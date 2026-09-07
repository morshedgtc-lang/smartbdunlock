import { createHmac } from 'crypto'

export const WEBHOOK_EVENTS = [
  'order.created',
  'order.updated',
  'order.processing',
  'order.completed',
  'order.failed',
  'order.cancelled',
  'order.rejected',
  'order.refunded',
  'order.replied',
  'test.ping',
] as const

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

export const WEBHOOK_MAX_ATTEMPTS = 8
export const WEBHOOK_TIMEOUT_MS = 5000
export const WEBHOOK_MAX_BACKOFF_MS = 60 * 60 * 1000

export function signWebhookPayload(secret: string, timestamp: number, rawBody: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')
}

export function isWebhook(secret: string): boolean {
  return secret.length > 0
}

export function backoffDelayMs(attempts: number, maxBackoffMs = WEBHOOK_MAX_BACKOFF_MS): number {
  if (attempts <= 0) return 0
  return Math.min(maxBackoffMs, 1000 * Math.pow(2, attempts - 1))
}

const STATUS_EVENT_MAP: Record<string, string> = {
  processing: 'order.processing',
  completed: 'order.completed',
  failed: 'order.failed',
  cancelled: 'order.cancelled',
  rejected: 'order.rejected',
  refunded: 'order.refunded',
}

export function statusToWebhookEvent(status: string): string {
  return STATUS_EVENT_MAP[status] || 'order.updated'
}