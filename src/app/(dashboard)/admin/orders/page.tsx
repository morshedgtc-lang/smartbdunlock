'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useApi } from '@/lib/useApi'
import { useToast } from '@/components/ui/Toast'
import { motion } from 'framer-motion'
import { Search, Eye, Loader2, X } from 'lucide-react'
import { useState } from 'react'

function renderCustomValue(value: string, fieldType?: string): string {
  if (!value) return '—'
  if (fieldType === 'image' || fieldType === 'file') return '📎 Attached'
  if (fieldType === 'checkbox') return value === 'true' ? '✓ Yes' : '✗ No'
  if (fieldType === 'imei_multi' || fieldType === 'serial_multi') {
    try {
      const arr = JSON.parse(value)
      return Array.isArray(arr) ? arr.join(', ') : value
    } catch {
      return value
    }
  }
  if (fieldType === 'multiselect') {
    try {
      const arr = JSON.parse(value)
      return Array.isArray(arr) ? arr.join(', ') : value
    } catch {
      return value
    }
  }
  return value
}

export default function OrdersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [viewOrder, setViewOrder] = useState<any>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const { toast } = useToast()
  const { data, loading, refetch } = useApi<any>({ url: '/api/orders' })
  const allOrders = data?.orders || []

  const filtered = allOrders.filter((o: any) => {
    const matchSearch = o.orderNumber.toLowerCase().includes(search.toLowerCase()) || o.imei?.toLowerCase().includes(search.toLowerCase()) || o.user?.name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  const sendReply = async (orderId: string) => {
    if (!replyText.trim()) return
    setSendingReply(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, notes: replyText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast('success', 'Reply sent')
      setReplyText('')
      refetch()
      setViewOrder({ ...viewOrder, notes: replyText })
    } catch (err: any) {
      toast('error', err.message)
    } finally {
      setSendingReply(false)
    }
  }

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdating(orderId)
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast('success', `Order status updated to ${newStatus}`)
      refetch()
      if (viewOrder?.id === orderId) setViewOrder({ ...viewOrder, status: newStatus })
    } catch (err: any) {
      toast('error', err.message)
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div>
        <Header title="Orders" subtitle="Loading..." />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Orders" subtitle={`${allOrders.length} total orders`} />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-3 flex-wrap">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input className="glass-input pl-9 w-64" placeholder="Search IMEI, order ID..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="glass-input w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="ALL">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Order Detail Modal */}
        {viewOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div className="glass p-6 w-full max-w-lg mx-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--foreground)]">Order {viewOrder.orderNumber}</h3>
                <button onClick={() => setViewOrder(null)} className="text-[var(--muted)] hover:text-[var(--foreground)]"><X size={20} /></button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-[var(--muted)]">Service</span><span className="text-[var(--foreground)]">{viewOrder.service?.name}</span></div>
                <div className="flex justify-between"><span className="text-[var(--muted)]">User</span><span className="text-[var(--foreground)]">{viewOrder.user?.name}</span></div>
                <div className="flex justify-between"><span className="text-[var(--muted)]">IMEI</span><span className="text-[var(--foreground)] font-mono">{viewOrder.imei || '—'}</span></div>
                <div className="flex justify-between"><span className="text-[var(--muted)]">Device</span><span className="text-[var(--foreground)]">{viewOrder.deviceInfo || '—'}</span></div>
                <div className="flex justify-between"><span className="text-[var(--muted)]">Cost</span><span className="text-[var(--foreground)]">${viewOrder.cost?.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-[var(--muted)]">Selling Price</span><span className="text-[var(--foreground)]">${viewOrder.sellingPrice?.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-[var(--muted)]">Profit</span><span className="text-green-500 font-bold">${viewOrder.profit?.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-[var(--muted)]">Status</span><StatusBadge status={viewOrder.status} /></div>
                <div className="flex justify-between"><span className="text-[var(--muted)]">Date</span><span className="text-[var(--foreground)]">{new Date(viewOrder.createdAt).toLocaleString()}</span></div>
                {viewOrder.notes && <div className="flex justify-between"><span className="text-[var(--muted)]">Notes</span><span className="text-[var(--foreground)]">{viewOrder.notes}</span></div>}
                {viewOrder.customValues && viewOrder.customValues.length > 0 && (
                  <div className="pt-2 border-t border-[var(--card-border)]">
                    <p className="text-xs text-[var(--muted)] mb-2">Custom Field Values</p>
                    {viewOrder.customValues.map((cv: any) => (
                      <div key={cv.id} className="flex justify-between py-1">
                        <span className="text-[var(--muted)]">{cv.customField?.label}</span>
                        <span className="text-[var(--foreground)] font-mono text-xs max-w-[200px] truncate">{renderCustomValue(cv.value, cv.customField?.fieldType)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reply Note */}
              <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
                <p className="text-xs text-[var(--muted)] mb-2">Reply / Add Note</p>
                <textarea
                  className="glass-input w-full min-h-[80px] resize-y"
                  placeholder="Type your reply or note..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                />
                <div className="flex justify-end mt-2">
                  <GlassButton
                    size="sm"
                    onClick={() => sendReply(viewOrder.id)}
                    disabled={sendingReply || !replyText.trim()}
                  >
                    {sendingReply ? <Loader2 size={14} className="animate-spin" /> : null}
                    Send Reply
                  </GlassButton>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
                <p className="text-xs text-[var(--muted)] mb-2">Update Status</p>
                <div className="flex gap-2 flex-wrap">
                  {['processing', 'completed', 'failed', 'cancelled'].map(status => (
                    <GlassButton
                      key={status}
                      size="sm"
                      variant={viewOrder.status === status ? 'primary' : 'secondary'}
                      onClick={() => updateStatus(viewOrder.id, status)}
                      disabled={updating === viewOrder.id || viewOrder.status === status}
                    >
                      {updating === viewOrder.id ? <Loader2 size={12} className="animate-spin" /> : null}
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </GlassButton>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        <GlassCard padding="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Order ID</th>
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Service</th>
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Device</th>
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">User</th>
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Status</th>
                  <th className="text-right py-4 px-4 text-[var(--muted)] font-medium">Price</th>
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Date</th>
                  <th className="text-right py-4 px-4 text-[var(--muted)] font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order: any, i: number) => (
                  <motion.tr key={order.id} className="border-b border-[var(--card-border)] hover:bg-white/5 dark:hover:bg-white/5 transition-colors" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                    <td className="py-3 px-4 font-mono font-medium text-[var(--foreground)]">{order.orderNumber}</td>
                    <td className="py-3 px-4 text-[var(--foreground)]">{order.service?.name || 'N/A'}</td>
                    <td className="py-3 px-4 text-[var(--muted)]">{order.deviceInfo || '—'}</td>
                    <td className="py-3 px-4 text-[var(--foreground)]">{order.user?.name || 'N/A'}</td>
                    <td className="py-3 px-4"><StatusBadge status={order.status} /></td>
                    <td className="py-3 px-4 text-right font-medium text-[var(--foreground)]">${order.sellingPrice?.toFixed(2) || '0.00'}</td>
                    <td className="py-3 px-4 text-xs text-[var(--muted)]">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <button className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors" onClick={() => setViewOrder(order)}>
                        <Eye size={14} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
