'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassDropdown } from '@/components/ui/GlassDropdown'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Modal } from '@/components/ui/Modal'
import { useApi } from '@/hooks/useApi'
import { useToast } from '@/components/ui/Toast'
import { motion } from 'framer-motion'
import { Search, Eye, Loader2, Send, User, Smartphone, DollarSign, Clock, CheckCircle2, ArrowLeft, StickyNote, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'

interface OrderCustomField {
  id: string
  value: string
  customField?: { label: string; fieldType: string }
}

interface AdminUser {
  id: string
  name: string
}

interface OrderItem {
  id: string
  orderNumber: string
  status: string
  priority?: string
  imei?: string
  deviceInfo?: string
  sellingPrice?: number
  profit?: number
  assignedTo?: string | null
  notes?: string
  internalNotes?: string
  createdAt: string
  customValues?: OrderCustomField[]
  service?: { name: string; type?: string }
  user?: { name: string; email: string }
}

interface TimelineNote {
  id: string
  authorName: string
  content: string
  visible: boolean
  createdAt: string
}

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

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { value: 'high', label: 'High', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
]

export default function OrdersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [viewOrder, setViewOrder] = useState<OrderItem | null>(null)
  const [updating, setUpdating] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [replySuccess, setReplySuccess] = useState(false)
  const replyInputRef = useRef<HTMLTextAreaElement>(null)
  const notesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { data, loading, error, refetch } = useApi<{ orders: OrderItem[] }>({ url: '/api/orders' })
  const allOrders = data?.orders || []

  const { data: adminUsersData } = useApi<{ users: AdminUser[] }>({ url: '/api/users?role=admin' })
  const adminUsers = adminUsersData?.users || []

  const [internalNotesText, setInternalNotesText] = useState('')
  const [savingInternalNotes, setSavingInternalNotes] = useState(false)
  const [timeline, setTimeline] = useState<TimelineNote[]>([])
  const [loadingTimeline, setLoadingTimeline] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteVisible, setNoteVisible] = useState(true)
  const [sendingNote, setSendingNote] = useState(false)

  const filtered = allOrders.filter((o: OrderItem) => {
    const matchSearch = o.orderNumber.toLowerCase().includes(search.toLowerCase()) || o.imei?.toLowerCase().includes(search.toLowerCase()) || o.user?.name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  useEffect(() => {
    if (viewOrder) {
      setReplySuccess(false)
      setReplyText('')
      setInternalNotesText(viewOrder.internalNotes || '')
      setNoteText('')
      setNoteVisible(true)
      loadTimeline(viewOrder.id)
    }
  }, [viewOrder])

  useEffect(() => {
    if (replySuccess) {
      notesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [replySuccess])

  const loadTimeline = async (orderId: string) => {
    setLoadingTimeline(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/timeline`)
      const data = await res.json()
      if (res.ok) setTimeline(data.timeline || [])
    } catch {
      // ignore
    } finally {
      setLoadingTimeline(false)
    }
  }

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
      setViewOrder((prev) => prev ? { ...prev, notes: replyText } : null)
      toast('success', 'Reply sent successfully')
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
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
      setViewOrder((prev) => prev ? { ...prev, status: newStatus } : null)
      loadTimeline(viewOrder.id)
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
    } finally {
      setUpdating(false)
    }
  }

  const updatePriority = async (newPriority: string) => {
    if (!viewOrder) return
    setUpdating(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: viewOrder.id, priority: newPriority }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast('success', `Priority updated to ${newPriority}`)
      refetch()
      setViewOrder((prev) => prev ? { ...prev, priority: newPriority } : null)
      loadTimeline(viewOrder.id)
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
    } finally {
      setUpdating(false)
    }
  }

  const updateAssignment = async (userId: string) => {
    if (!viewOrder) return
    setUpdating(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: viewOrder.id, assignedTo: userId || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast('success', userId ? 'Order assigned' : 'Order unassigned')
      refetch()
      setViewOrder((prev) => prev ? { ...prev, assignedTo: userId || null } : null)
      loadTimeline(viewOrder.id)
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
    } finally {
      setUpdating(false)
    }
  }

  const saveInternalNotes = async () => {
    if (!viewOrder) return
    setSavingInternalNotes(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: viewOrder.id, internalNotes: internalNotesText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast('success', 'Internal notes saved')
      refetch()
      setViewOrder((prev) => prev ? { ...prev, internalNotes: internalNotesText } : null)
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
    } finally {
      setSavingInternalNotes(false)
    }
  }

  const sendNote = async () => {
    if (!viewOrder || !noteText.trim()) return
    setSendingNote(true)
    try {
      const res = await fetch(`/api/orders/${viewOrder.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteText, visible: noteVisible }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setNoteText('')
      setNoteVisible(true)
      toast('success', 'Note added')
      loadTimeline(viewOrder.id)
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
    } finally {
      setSendingNote(false)
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
            <GlassDropdown
              options={[{ value: 'ALL', label: 'All Status' }, ...STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))]}
              value={statusFilter}
              onChange={setStatusFilter}
              size="sm"
            />
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
                    {viewOrder.customValues.map((cv: OrderCustomField) => (
                      <div key={cv.id} className="flex justify-between py-1.5 px-3 rounded-lg bg-white/3 text-sm">
                        <span className="text-[var(--muted)]">{cv.customField?.label}</span>
                        <span className="text-[var(--foreground)] font-mono text-xs max-w-[250px] truncate">{renderCustomValue(cv.value, cv.customField?.fieldType)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Priority & Assignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
                  <label className="text-xs font-medium text-[var(--muted)] mb-2 block">Priority</label>
                  <div className="flex gap-2 flex-wrap">
                    {PRIORITY_OPTIONS.map(p => (
                      <button
                        key={p.value}
                        onClick={() => updatePriority(p.value)}
                        disabled={updating}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          (viewOrder.priority || 'normal') === p.value
                            ? p.color
                            : 'bg-white/5 text-[var(--muted)] border-[var(--card-border)] hover:bg-white/10'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
                  <label className="text-xs font-medium text-[var(--muted)] mb-2 block">Assigned To</label>
                  <GlassDropdown
                    options={[{ value: '', label: 'Unassigned' }, ...adminUsers.map((u: AdminUser) => ({ value: u.id, label: u.name }))]}
                    value={viewOrder.assignedTo || ''}
                    onChange={(v) => updateAssignment(v)}
                    disabled={updating}
                  />
                </div>
              </div>

              {/* Internal Notes */}
              <div className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
                    <StickyNote size={13} /> Internal Notes
                  </label>
                  <span className="text-[10px] text-[var(--muted)] bg-white/5 px-2 py-0.5 rounded">Admin only</span>
                </div>
                <textarea
                  className="glass-input w-full min-h-[60px] resize-y text-sm"
                  placeholder="Internal notes (not visible to client)..."
                  value={internalNotesText}
                  onChange={e => setInternalNotesText(e.target.value)}
                />
                <div className="flex justify-end mt-2">
                  <GlassButton size="sm" onClick={saveInternalNotes} disabled={savingInternalNotes}>
                    {savingInternalNotes ? <Loader2 size={12} className="animate-spin" /> : null}
                    Save Notes
                  </GlassButton>
                </div>
              </div>

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

              {/* Reply Section (client-visible notes) */}
              <div className="border-t border-[var(--card-border)] pt-4">
                <p className="text-xs font-medium text-[var(--muted)] mb-3 uppercase tracking-wider">Reply / Add Note</p>

                {viewOrder.notes && (
                  <div className="mb-3 p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
                    <p className="text-xs text-[var(--muted)] mb-1">Previous Note</p>
                    <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">{viewOrder.notes}</p>
                  </div>
                )}

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

              {/* Order Timeline */}
              <div className="border-t border-[var(--card-border)] pt-4">
                <p className="text-xs font-medium text-[var(--muted)] mb-3 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare size={13} /> Order Timeline
                </p>

                {loadingTimeline ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 size={20} className="animate-spin text-[var(--accent)]" />
                  </div>
                ) : timeline.length === 0 ? (
                  <p className="text-sm text-[var(--muted)] py-4 text-center">No notes yet</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {timeline.map((note: TimelineNote) => (
                      <div key={note.id} className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-[var(--foreground)]">{note.authorName}</span>
                          <div className="flex items-center gap-2">
                            {!note.visible && (
                              <span className="text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">Internal</span>
                            )}
                            <span className="text-[10px] text-[var(--muted)]">{new Date(note.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                        <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">{note.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add note to timeline */}
                <div className="mt-3">
                  <textarea
                    className="glass-input w-full min-h-[60px] resize-y text-sm"
                    placeholder="Add a note to the timeline..."
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <label className="flex items-center gap-2 text-xs text-[var(--muted)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={noteVisible}
                        onChange={e => setNoteVisible(e.target.checked)}
                        className="rounded border-[var(--card-border)]"
                      />
                      Visible to client
                    </label>
                    <GlassButton
                      size="sm"
                      onClick={sendNote}
                      disabled={sendingNote || !noteText.trim()}
                    >
                      {sendingNote ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      Add Note
                    </GlassButton>
                  </div>
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
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Priority</th>
                  <th className="text-right py-4 px-4 text-[var(--muted)] font-medium">Price</th>
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Date</th>
                  <th className="text-right py-4 px-4 text-[var(--muted)] font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order: OrderItem, i: number) => {
                  const p = PRIORITY_OPTIONS.find(po => po.value === (order.priority || 'normal'))
                  return (
                    <motion.tr key={order.id} className="border-b border-[var(--card-border)] hover:bg-white/5 dark:hover:bg-white/5 transition-colors" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                      <td className="py-3 px-4 font-mono font-medium text-[var(--foreground)]">{order.orderNumber}</td>
                      <td className="py-3 px-4 text-[var(--foreground)]">{order.service?.name || 'N/A'}</td>
                      <td className="py-3 px-4 text-[var(--muted)]">{order.deviceInfo || '—'}</td>
                      <td className="py-3 px-4 text-[var(--foreground)]">{order.user?.name || 'N/A'}</td>
                      <td className="py-3 px-4"><StatusBadge status={order.status} /></td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${p?.color || ''}`}>{p?.label || 'Normal'}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-[var(--foreground)]">${order.sellingPrice?.toFixed(2) || '0.00'}</td>
                      <td className="py-3 px-4 text-xs text-[var(--muted)]">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-right">
                        <GlassButton size="sm" variant="ghost" onClick={() => setViewOrder(order)}>
                          <Eye size={14} /> View
                        </GlassButton>
                      </td>
                    </motion.tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[var(--muted)]">No orders found</td>
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
