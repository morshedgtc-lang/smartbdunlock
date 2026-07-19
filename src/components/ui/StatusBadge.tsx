'use client'

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'badge-success',
    completed: 'badge-success',
    processing: 'badge-info',
    pending: 'badge-warning',
    new: 'badge-info',
    failed: 'badge-danger',
    rejected: 'badge-danger',
    refunded: 'badge-purple',
    cancelled: 'badge-danger',
    suspended: 'badge-danger',
    disabled: 'badge-danger',
    inactive: 'badge-neutral',
    ignored: 'badge-neutral',
    partial: 'badge-warning',
    deposit: 'badge-success',
    order_payment: 'badge-warning',
    order_refund: 'badge-info',
    transfer: 'badge-info',
    commission: 'badge-success',
    withdraw: 'badge-danger',
  }

  const key = status?.toLowerCase() || ''
  const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <span className={`badge ${map[key] || 'badge-neutral'}`}>
      {label}
    </span>
  )
}
