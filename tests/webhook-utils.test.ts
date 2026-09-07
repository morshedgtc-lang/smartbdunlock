import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'
import {
  signWebhookPayload,
  backoffDelayMs,
  statusToWebhookEvent,
  isWebhook,
  WEBHOOK_MAX_BACKOFF_MS,
  WEBHOOK_EVENTS,
} from '../src/lib/webhook-utils'

describe('signWebhookPayload', () => {
  it('produces a valid HMAC-SHA256 hex digest', () => {
    const secret = 'test-secret'
    const timestamp = 1728000000
    const body = JSON.stringify({ event: 'order.created', data: { id: 'x' } })

    const expected = createHmac('sha256', secret)
      .update(`${timestamp}.${body}`)
      .digest('hex')

    expect(signWebhookPayload(secret, timestamp, body)).toBe(expected)
    expect(signWebhookPayload(secret, timestamp, body)).toMatch(/^[a-f0-9]{64}$/)
  })

  it('changes signature when timestamp, body, or secret changes', () => {
    const secret = 's'
    const ts = 100
    const body = '{}'

    const base = signWebhookPayload(secret, ts, body)
    expect(signWebhookPayload(secret, ts + 1, body)).not.toBe(base)
    expect(signWebhookPayload(secret, ts, '{ }')).not.toBe(base)
    expect(signWebhookPayload('other', ts, body)).not.toBe(base)
  })
})

describe('backoffDelayMs', () => {
  it('computes exponential backoff', () => {
    expect(backoffDelayMs(0)).toBe(0)
    expect(backoffDelayMs(1)).toBe(1000)
    expect(backoffDelayMs(2)).toBe(2000)
    expect(backoffDelayMs(3)).toBe(4000)
    expect(backoffDelayMs(4)).toBe(8000)
  })

  it('caps at 1 hour', () => {
    expect(backoffDelayMs(20)).toBe(WEBHOOK_MAX_BACKOFF_MS)
    expect(backoffDelayMs(100)).toBe(WEBHOOK_MAX_BACKOFF_MS)
  })

  it('honors a custom cap', () => {
    expect(backoffDelayMs(10, 5000)).toBe(5000)
  })
})

describe('statusToWebhookEvent', () => {
  it('maps known statuses', () => {
    expect(statusToWebhookEvent('processing')).toBe('order.processing')
    expect(statusToWebhookEvent('completed')).toBe('order.completed')
    expect(statusToWebhookEvent('failed')).toBe('order.failed')
    expect(statusToWebhookEvent('cancelled')).toBe('order.cancelled')
    expect(statusToWebhookEvent('rejected')).toBe('order.rejected')
    expect(statusToWebhookEvent('refunded')).toBe('order.refunded')
  })

  it('falls back to order.updated for unknown statuses', () => {
    expect(statusToWebhookEvent('pending')).toBe('order.updated')
    expect(statusToWebhookEvent('')).toBe('order.updated')
  })
})

describe('isWebhook', () => {
  it('returns true for non-empty secrets', () => {
    expect(isWebhook('secret')).toBe(true)
  })

  it('returns false for empty secrets', () => {
    expect(isWebhook('')).toBe(false)
  })
})

describe('WEBHOOK_EVENTS', () => {
  it('includes all core order events plus test.ping', () => {
    for (const ev of [
      'order.created',
      'order.updated',
      'order.completed',
      'order.failed',
      'order.cancelled',
      'order.rejected',
      'order.refunded',
      'order.replied',
      'order.processing',
      'test.ping',
    ]) {
      expect(WEBHOOK_EVENTS).toContain(ev)
    }
  })

  it('is a readonly tuple (usable with z.enum)', () => {
    expect(WEBHOOK_EVENTS).toHaveLength(10)
  })
})