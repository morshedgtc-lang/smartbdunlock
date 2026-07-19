'use client'

import { GlassButton } from '@/components/ui/GlassButton'
import { GlassDropdown } from '@/components/ui/GlassDropdown'
import { Tabs, TabItem } from '@/components/ui/Tabs'
import { Drawer } from '@/components/ui/Drawer'
import { useToast } from '@/components/ui/Toast'
import { useState } from 'react'
import {
  Pencil, Check, X, Loader2, User, Smartphone, DollarSign,
  Clock, Send, Paperclip, History, MessageSquare, CheckCircle2,
} from 'lucide-react'

export interface DetailOrder {
  id: string
  orderNumber: string
  status: string
  priority?: string
  imei?: string | null
  deviceInfo?: string | null
  cost?: number
  sellingPrice?: number
  profit?: number
  notes?: string | null
  internalNotes?: string | null
  result?: string | null
  completedAt?: string | null
  assignedTo?: string | null
  createdAt: string
  updatedAt: string
  user: { id: string; name: string; email: string; phone?: string | null; userId?: string; walletBalance?: number }
  service: { name?: string; type?: string; processingTime?: string | null; category?: string | null }
  supplier?: string | null
  customValues: { id: string; label?: string; fieldType?: string; previewImage?: boolean; value: string }[]
  attachments: { id: string; fileName: string; fileUrl: string; fileType?: string | null; fileSize?: number | null; uploadedByName?: string | null; createdAt: string }[]
  timeline: { id: string; authorName: string; content: string; visible: boolean; createdAt: string }[]
  messages: { id: string; authorName: string; content: string; visible: boolean; createdAt: string }[]
  payments: { id: string; type: string; amount: number; balanceAfter?: number; description?: string | null; status?: string; reference?: string | null; createdAt: string }[]
  logs: { id: string; action: string; description?: string | null; module?: string | null; createdAt: string }[]
}

export const DETAIL_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'refunded', label: 'Refunded' },
]

export function renderCustomValue(value: string, fieldType?: string): string {
  if (!value) return '—'
  if (fieldType === 'image' || fieldType === 'file') return '📎 Attached'
  if (fieldType === 'checkbox') return value === 'true' ? '✓ Yes' : '✗ No'
  if (['imei_multi', 'serial_multi', 'multiselect'].includes(fieldType || '')) {
    try {
      const arr = JSON.parse(value)
      return Array.isArray(arr) ? arr.join(', ') : value
    } catch {
      return value
    }
  }
  return value
}

interface OrderDetailDrawerProps {
  open: boolean
  onClose: () => void
  order: DetailOrder | null
  loading?: boolean
  adminUsers?: { id: string; name: string }[]
  onUpdate?: () => void
  role?: 'admin' | 'client'
}

export function OrderDetailDrawer({ open, onClose, order, loading, adminUsers = [], onUpdate, role = 'admin' }: OrderDetailDrawerProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('overview')

  const handleUpdate = () => {
    onUpdate?.()
    setActiveTab('overview')
  }

  return (
    <Drawer open={open} onClose={onClose} title={order?.orderNumber} subtitle={order?.service?.name} side="right" size="xl">
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-[var(--accent)]" />
        </div>
      )}
      {order && !loading && (
        <OrderDrawerContent order={order} adminUsers={adminUsers} activeTab={activeTab} setActiveTab={setActiveTab} onUpdate={handleUpdate} toast={toast} role={role} />
      )}
    </Drawer>
  )
}

function OrderDrawerContent({
  order, adminUsers, activeTab, setActiveTab, onUpdate, toast, role,
}: {
  order: DetailOrder
  adminUsers: { id: string; name: string }[]
  activeTab: string
  setActiveTab: (k: string) => void
  onUpdate: () => void
  toast: (type: 'success' | 'error' | 'info' | 'warning', msg: string) => void
  role: 'admin' | 'client'
}) {
  const [internalNotes, setInternalNotes] = useState(order.internalNotes || '')
  const [reply, setReply] = useState('')
  const [noteVisible, setNoteVisible] = useState(true)
  const [busy, setBusy] = useState(false)

  const tabs: TabItem[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'timeline', label: 'Timeline', badge: order.timeline.length },
    { key: 'files', label: 'Files', badge: order.attachments.length },
    { key: 'messages', label: 'Messages', badge: order.messages.length },
    { key: 'payment', label: 'Payment', badge: order.payments.length },
    ...(role === 'admin' ? [
      { key: 'history', label: 'History', badge: order.logs.length },
      { key: 'logs', label: 'Logs', badge: order.logs.length },
    ] : []),
  ]

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, ...body }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast('success', 'Updated')
      onUpdate()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  const sendNote = async (visible: boolean) => {
    if (!reply.trim()) return
    setBusy(true)
    try {
      const res = await fetch(`/api/orders/${order.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: reply, visible }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setReply('')
      setNoteVisible(true)
      toast('success', 'Note added')
      onUpdate()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {role === 'admin' && (
      <div className="flex flex-wrap gap-1.5">
        {DETAIL_STATUS_OPTIONS.map((s) => (
          <GlassButton
            key={s.value}
            size="sm"
            variant={order.status === s.value ? 'primary' : 'secondary'}
            disabled={busy || order.status === s.value}
            onClick={() => patch({ status: s.value })}
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : null}
            {s.label}
          </GlassButton>
        ))}
      </div>
      )}

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Info label="Customer" value={order.user.name} icon={<User size={13} />} />
            <Info label="User ID" value={order.user.userId || '—'} icon={<User size={13} />} />
            <Info label="Wallet Balance" value={`$${(order.user.walletBalance || 0).toFixed(2)}`} icon={<DollarSign size={13} />} />
            <Info label="Service" value={order.service.name || 'N/A'} icon={<Smartphone size={13} />} />
            <Info label="Category" value={order.service.category || '—'} icon={<Smartphone size={13} />} />
            <Info label="Price" value={`$${(order.sellingPrice || 0).toFixed(2)}`} icon={<DollarSign size={13} />} />
            <Info label="IMEI" value={order.imei || '—'} icon={<Smartphone size={13} />} />
            <Info label="Serial Number" value={order.deviceInfo || '—'} icon={<Smartphone size={13} />} />
            <Info label="Device Model" value={order.deviceInfo || '—'} icon={<Smartphone size={13} />} />
            <Info label="Expected Time" value={order.service.processingTime || '—'} icon={<Clock size={13} />} />
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider font-medium mb-2">Order Details</p>
            <div className="space-y-1.5">
              {order.customValues.length === 0 && <p className="text-sm text-[var(--muted)]">No custom fields</p>}
              {order.customValues.map((cv) => (
                <div key={cv.id} className="py-1.5 px-3 rounded-lg bg-white/3 text-sm">
                  {((cv.fieldType === 'file' || cv.fieldType === 'image') && cv.previewImage && cv.value && !cv.value.startsWith('data:')) ? (
                    <div className="flex items-center gap-3">
                      <span className="text-[var(--muted)]">{cv.label}</span>
                      <a href={cv.value} target="_blank" rel="noreferrer" className="block flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={cv.value} alt={cv.label || 'Preview'} className="w-[120px] h-[120px] object-cover rounded-lg border border-[var(--card-border)]" />
                      </a>
                    </div>
                  ) : ((cv.fieldType === 'file' || cv.fieldType === 'image') && cv.previewImage && !cv.value) ? (
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--muted)]">{cv.label}</span>
                      <span className="text-xs text-[var(--muted)]">No image uploaded.</span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--muted)]">{cv.label}</span>
                      <span className="text-[var(--foreground)] font-mono text-xs max-w-[250px] truncate">{renderCustomValue(cv.value, cv.fieldType)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {role === 'admin' && (
          <div className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5"><Pencil size={13} /> Internal Notes</label>
              <span className="text-[10px] text-[var(--muted)] bg-white/5 px-2 py-0.5 rounded">Admin only</span>
            </div>
            <textarea className="glass-input w-full min-h-[60px] resize-y text-sm" value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} />
            <div className="flex justify-end mt-2">
              <GlassButton size="sm" onClick={() => patch({ internalNotes })} disabled={busy}><Check size={12} /> Save</GlassButton>
            </div>
          </div>
          )}

          {role === 'admin' && (
          <div className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider block mb-2">Assigned To</label>
            <GlassDropdown
              options={[{ value: '', label: 'Unassigned' }, ...adminUsers.map((u) => ({ value: u.id, label: u.name }))]}
              value={order.assignedTo || ''}
              onChange={(v) => patch({ assignedTo: v || null })}
            />
          </div>
          )}

          {order.notes && (
            <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
              <p className="text-xs text-[var(--muted)] uppercase tracking-wider font-medium mb-2 flex items-center gap-1.5"><MessageSquare size={13} /> Customer Notes</p>
              <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'timeline' && <TimelineView items={order.timeline} />}

      {activeTab === 'files' && (
        <div className="space-y-2">
          {order.attachments.length === 0 && <p className="text-sm text-[var(--muted)] py-4 text-center">No attachments</p>}
          {order.attachments.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
              <Paperclip size={16} className="text-[var(--accent)]" />
              <div className="min-w-0 flex-1">
                <a href={a.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-[var(--foreground)] hover:underline truncate block">{a.fileName}</a>
                <p className="text-xs text-[var(--muted)]">{a.uploadedByName || 'Unknown'} · {new Date(a.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="space-y-2">
          {order.messages.filter((m) => role === 'admin' || m.visible).length === 0 && <p className="text-sm text-[var(--muted)] py-4 text-center">No messages</p>}
          {order.messages.filter((m) => role === 'admin' || m.visible).map((m) => (
            <div key={m.id} className={`p-3 rounded-xl border ${m.visible ? 'bg-white/5 border-[var(--card-border)]' : 'bg-orange-500/5 border-orange-500/20'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-[var(--foreground)]">{m.authorName}</span>
                <span className="text-[10px] text-[var(--muted)]">{new Date(m.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">{m.content}</p>
            </div>
          ))}
          <div className="pt-2 space-y-2">
            <textarea className="glass-input w-full min-h-[60px] resize-y text-sm" placeholder="Write a message..." value={reply} onChange={(e) => setReply(e.target.value)} />
            <div className="flex items-center justify-between">
              {role === 'admin' ? (
                <label className="flex items-center gap-2 text-xs text-[var(--muted)] cursor-pointer">
                  <input type="checkbox" checked={noteVisible} onChange={(e) => setNoteVisible(e.target.checked)} className="rounded" />
                  Visible to client
                </label>
              ) : <div />}
              <GlassButton size="sm" onClick={() => sendNote(role === 'admin' ? noteVisible : true)} disabled={busy || !reply.trim()}>
                <Send size={12} /> Send
              </GlassButton>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payment' && (
        <div className="space-y-2">
          {order.payments.length === 0 && <p className="text-sm text-[var(--muted)] py-4 text-center">No payment records</p>}
          {order.payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)] capitalize">{p.type.replace(/_/g, ' ')}</p>
                <p className="text-xs text-[var(--muted)]">{p.description || new Date(p.createdAt).toLocaleString()}</p>
              </div>
              <span className={`font-bold ${p.amount < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {p.amount < 0 ? '-' : '+'}${Math.abs(p.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-2">
          {order.logs.length === 0 && <p className="text-sm text-[var(--muted)] py-4 text-center">No history</p>}
          {order.logs.map((l) => (
            <div key={l.id} className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-[var(--foreground)] capitalize">{l.action.replace(/[._]/g, ' ')}</span>
                <span className="text-[10px] text-[var(--muted)]">{new Date(l.createdAt).toLocaleString()}</span>
              </div>
              {l.description && <p className="text-sm text-[var(--muted)]">{l.description}</p>}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-[var(--muted)] mb-1"><History size={13} /> Audit trail</div>
          {order.logs.length === 0 && <p className="text-sm text-[var(--muted)] py-4 text-center">No logs</p>}
          {order.logs.map((l) => (
            <div key={l.id} className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)] text-sm">
              <p className="text-[var(--foreground)]">{l.action}</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">{l.module} · {new Date(l.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Info({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
      <div className="flex items-center gap-2 mb-1 text-[var(--accent)]">{icon}<span className="text-xs text-[var(--muted)]">{label}</span></div>
      <p className="text-sm font-medium text-[var(--foreground)] truncate">{value}</p>
    </div>
  )
}

function TimelineView({ items }: { items: { id: string; authorName: string; content: string; createdAt: string }[] }) {
  if (items.length === 0) return <p className="text-sm text-[var(--muted)] py-4 text-center">No timeline events</p>
  return (
    <div className="relative pl-4">
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-indigo-500/40 via-purple-500/30 to-transparent" />
      <div className="space-y-4">
        {items.map((ev) => (
          <div key={ev.id} className="relative">
            <div className="absolute -left-4 top-1 w-[15px] h-[15px] rounded-full bg-indigo-500/30 border-2 border-indigo-500" />
            <div className="p-3 rounded-xl bg-white/5">
              <p className="text-sm font-medium text-[var(--foreground)]">{ev.content}</p>
              <p className="text-xs text-[var(--muted)] mt-1">{ev.authorName} · {new Date(ev.createdAt).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
