'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Modal } from '@/components/ui/Modal'
import { useApi } from '@/hooks/useApi'
import { useToast } from '@/components/ui/Toast'
import { motion } from 'framer-motion'
import { Search, Eye, Loader2, Send, User, Smartphone, DollarSign, Clock, CheckCircle2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'

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

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'badge-warning' },
  { value: 'processing', label: 'Processing', color: 'badge-info' },
  { value: 'completed', label: 'Completed', color: 'badge-success' },
  { value: 'failed', label: 'Failed', color: 'badge-danger' },
  { value: 'cancelled', label: 'Cancelled', color: 'badge-danger' },
]

export default function OrdersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [viewOrder, setViewOrder] = useState<any>(null)
  const [updating, setUpdating] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [replySuccess, setReplySuccess] = useState(false)
  const replyInputRef = useRef<HTMLTextAreaElement>(null)
  const notesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { data, loading, error, refetch } = useApi<any>({ url: '/api/orders' })
  const allOrders = data?.orders || []

  const filtered = allOrders.filter((o: any) => {
    const matchSearch = o.orderNumber.toLowerCase().includes(search.toLowerCase()) || o.imei?.toLowerCase().includes(search.toLowerCase()) || o.user?.name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  useEffect(() => {
    if (viewOrder) {
      setReplySuccess(false)
      setReplyText('')
    }
  }, [viewOrder?.id])

  useEffect(() => {
    if (replySuccess) {
      notesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [replySuccess])

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
      setReplyText('')
      setReplySuccess(true)
      refetch()
      setViewOrder((prev: any) => ({ ...prev, notes: replyText }))
      toast('success', 'Reply sent successfully')
    } catch (err: any) {
      toast('error', err.message)
    } finally {
      setSendingReply(false)
    }
  }

  const updateStatus = async (newStatus: string) => {
    if (!viewOrder) return
    setUpdating(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: viewOrder.id, status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast('success', `Status updated to ${newStatus}`)
      refetch()
      setViewOrder((prev: any) => ({ ...prev, status: newStatus }))
    } catch (err: any) {
      toast('error', err.message)
    } finally {
      setUpdating(false)
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

  if (error) {
    return (
      <div>
        <Header title="Orders" />
        <div className="p-6 flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-red-400 text-sm">{error}</p>
          <Link href="/login" className="text-[var(--accent)] text-sm hover:underline">Go to Login</Link>
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
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Order Detail Modal */}
        <Modal
          open={!!viewOrder}
          onClose={() => setViewOrder(null)}
          title={viewOrder ? `Order ${viewOrder.orderNumber}` : ''}
          size="lg"
        >
          {viewOrder && (
            <div className="space-y-5">
              {/* Order Info Header */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
                  <div className="flex items-center gap-2 mb-1">
                    <User size={13} className="text-[var(--accent)]" />
                    <span className="text-xs text-[var(--muted)]">Client</span>
                  </div>
                  <p className="text-sm font-medium text-[var(--foreground)]">{viewOrder.user?.name || 'N/A'}</p>
                  <p className="text-xs text-[var(--muted)]">{viewOrder.user?.email}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
                  <div className="flex items-center gap-2 mb-1">
                    <Smartphone size={13} className="text-[var(--accent)]" />
                    <span className="text-xs text-[var(--muted)]">Service</span>
                  </div>
                  <p className="text-sm font-medium text-[var(--foreground)]">{viewOrder.service?.name}</p>
                  <p className="text-xs text-[var(--muted)]">{viewOrder.service?.type}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign size={13} className="text-[var(--accent)]" />
                    <span className="text-xs text-[var(--muted)]">Price</span>
                  </div>
                  <p className="text-sm font-bold text-[var(--foreground)]">${viewOrder.sellingPrice?.toFixed(2)}</p>
                  <p className="text-xs text-emerald-500">Profit: ${viewOrder.profit?.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={13} className="text-[var(--accent)]" />
                    <span className="text-xs text-[var(--muted)]">Date</span>
                  </div>
                  <p className="text-sm font-medium text-[var(--foreground)]">{new Date(viewOrder.createdAt).toLocaleDateString()}</p>
                  <p className="text-xs text-[var(--muted)]">{new Date(viewOrder.createdAt).toLocaleTimeString()}</p>
                </div>
              </div>

              {/* Device & IMEI */}
              {(viewOrder.imei || viewOrder.deviceInfo) && (
                <div className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {viewOrder.deviceInfo && (
                      <div><span className="text-[var(--muted)]">Device: </span><span className="text-[var(--foreground)]">{viewOrder.deviceInfo}</span></div>
                    )}
                    {viewOrder.imei && (
                      <div><span className="text-[var(--muted)]">IMEI: </span><span className="text-[var(--foreground)] font-mono">{viewOrder.imei}</span></div>
                    )}
                  </div>
                </div>
              )}

              {/* Custom Field Values */}
              {viewOrder.customValues && viewOrder.customValues.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[var(--muted)] mb-2 uppercase tracking-wider">Order Details</p>
                  <div className="space-y-1.5">
                    {viewOrder.customValues.map((cv: any) => (
                      <div key={cv.id} className="flex justify-between py-1.5 px-3 rounded-lg bg-white/3 text-sm">
                        <span className="text-[var(--muted)]">{cv.customField?.label}</span>
                        <span className="text-[var(--foreground)] font-mono text-xs max-w-[250px] truncate">{renderCustomValue(cv.value, cv.customField?.fieldType)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Control */}
              <div>
                <p className="text-xs font-medium text-[var(--muted)] mb-2 uppercase tracking-wider">Update Status</p>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_OPTIONS.map(s => (
                    <GlassButton
                      key={s.value}
                      size="sm"
                      variant={viewOrder.status === s.value ? 'primary' : 'secondary'}
                      onClick={() => updateStatus(s.value)}
                      disabled={updating || viewOrder.status === s.value}
                    >
                      {updating ? <Loader2 size={12} className="animate-spin" /> : null}
                      {s.label}
                    </GlassButton>
                  ))}
                </div>
              </div>

              {/* Reply Section */}
              <div className="border-t border-[var(--card-border)] pt-4">
                <p className="text-xs font-medium text-[var(--muted)] mb-3 uppercase tracking-wider">Reply / Add Note</p>

                {/* Existing notes */}
                {viewOrder.notes && (
                  <div className="mb-3 p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
                    <p className="text-xs text-[var(--muted)] mb-1">Previous Note</p>
                    <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">{viewOrder.notes}</p>
                  </div>
                )}

                {/* Reply success feedback */}
                {replySuccess && (
                  <motion.div
                    className="mb-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-emerald-500 font-medium">Reply sent successfully</span>
                  </motion.div>
                )}

                <textarea
                  ref={replyInputRef}
                  className="glass-input w-full min-h-[80px] resize-y"
                  placeholder="Type your reply or note..."
                  value={replyText}
                  onChange={e => { setReplyText(e.target.value); setReplySuccess(false) }}
                />
                <div ref={notesEndRef} />
                <div className="flex justify-between items-center mt-3">
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewOrder(null)}
                  >
                    <ArrowLeft size={14} /> Back to Orders
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    onClick={() => sendReply(viewOrder.id)}
                    disabled={sendingReply || !replyText.trim()}
                  >
                    {sendingReply ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Send Reply
                  </GlassButton>
                </div>
              </div>
            </div>
          )}
        </Modal>

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
                    <td className="py-3 px-4 text-right">
                      <GlassButton size="sm" variant="ghost" onClick={() => setViewOrder(order)}>
                        <Eye size={14} /> View
                      </GlassButton>
                    </td>
                  </motion.tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[var(--muted)]">No orders found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
