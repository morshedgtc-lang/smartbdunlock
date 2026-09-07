'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassDropdown } from '@/components/ui/GlassDropdown'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { useApi } from '@/hooks/useApi'
import { motion } from 'framer-motion'
import { Webhook, Plus, Loader2, X, Trash2, Send, Eye, Copy, CheckCircle } from 'lucide-react'
import { useState } from 'react'

const ALL_EVENTS = [
  'order.created',
  'order.processing',
  'order.completed',
  'order.failed',
  'order.cancelled',
  'order.rejected',
  'order.refunded',
  'order.replied',
  'order.updated',
  'test.ping',
]

interface Reseller {
  id: string
  email: string
  name: string
  status: string
}

interface DeliveryCounts {
  success: number
  failed: number
  pending: number
}

interface WebhookRow {
  id: string
  userId: string
  url: string
  hasSecret: boolean
  events: string[]
  status: string
  updatedAt: string
  deliveries: DeliveryCounts
  reseller: { id: string; email: string; name: string; role: string; status: string }
}

interface Delivery {
  id: string
  event: string
  status: string
  attempts: number
  ttlAttempts: number
  responseCode: number | null
  error: string | null
  nextAttemptAt: string | null
  lastAttemptAt: string | null
  createdAt: string
  payload: string | null
}

export default function WebhooksPage() {
  const { toast } = useToast()
  const { data, loading, error, refetch } = useApi<{ webhooks: WebhookRow[] }>({ url: '/api/webhooks' })
  const { data: resellersData } = useApi<{ users: Reseller[] }>({ url: '/api/users?role=reseller&limit=1000' })
  const resellers = resellersData?.users || []
  const webhooks = data?.webhooks || []

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<WebhookRow | null>(null)
  const [form, setForm] = useState({ userId: '', url: '', secret: '', status: 'active' as string, events: [...ALL_EVENTS] })
  const [saving, setSaving] = useState(false)
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showDelete, setShowDelete] = useState<WebhookRow | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deliveries, setDeliveries] = useState<Record<string, Delivery[]>>({})
  const [loadingDeliveries, setLoadingDeliveries] = useState<string | null>(null)

  const openCreate = () => {
    setEditing(null)
    setGeneratedSecret(null)
    setForm({ userId: '', url: '', secret: '', status: 'active', events: [...ALL_EVENTS] })
    setShowModal(true)
  }

  const openEdit = (w: WebhookRow) => {
    setEditing(w)
    setGeneratedSecret(null)
    setForm({ userId: w.userId, url: w.url, secret: '', status: w.status, events: [...w.events] })
    setShowModal(true)
  }

  const toggleEvent = (ev: string) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter((e) => e !== ev) : [...f.events, ev],
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        userId: form.userId,
        url: form.url,
        status: form.status,
        events: form.events,
      }
      if (form.secret) payload.secret = form.secret
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (form.secret || !editing) {
        setGeneratedSecret(form.secret)
      }
      toast('success', editing ? 'Webhook updated' : 'Webhook configured')
      setShowModal(false)
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed to save webhook')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async (w: WebhookRow) => {
    setTestingId(w.id)
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', userId: w.userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.ok) toast('success', 'Test webhook delivered successfully')
      else toast('error', `Test failed: ${data.delivery?.error || 'delivery error'}`)
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Test failed')
    } finally {
      setTestingId(null)
    }
  }

  const handleToggleStatus = async (w: WebhookRow) => {
    try {
      const res = await fetch(`/api/webhooks/${w.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: w.status === 'active' ? 'disabled' : 'active' }),
      })
      if (!res.ok) throw new Error('Failed to update webhook')
      toast('success', w.status === 'active' ? 'Webhook disabled' : 'Webhook enabled')
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
    }
  }

  const handleDelete = async () => {
    if (!showDelete) return
    try {
      const res = await fetch(`/api/webhooks/${showDelete.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete webhook')
      toast('success', 'Webhook deleted')
      setShowDelete(null)
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
    }
  }

  const loadDeliveries = async (w: WebhookRow) => {
    if (expanded === w.id) {
      setExpanded(null)
      return
    }
    setExpanded(w.id)
    setLoadingDeliveries(w.id)
    try {
      const res = await fetch(`/api/webhooks/${w.id}/deliveries`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDeliveries((d) => ({ ...d, [w.id]: data.deliveries || [] }))
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed to load deliveries')
    } finally {
      setLoadingDeliveries(null)
    }
  }

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div>
        <Header title="Webhooks" subtitle="Loading..." />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Header title="Webhooks" />
        <div className="p-6 flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Webhooks" subtitle={`${webhooks.length} reseller webhooks`} />
      <div className="p-6 space-y-6">
        <div className="flex justify-end">
          <GlassButton size="sm" onClick={openCreate}>
            <Plus size={16} /> Configure Webhook
          </GlassButton>
        </div>

        {generatedSecret && (
          <motion.div className="glass-premium p-4 border border-amber-500/20" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3">
              <CheckCircle size={20} className="text-amber-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--muted)] mb-1">
                  Webhook signing secret — share this with the reseller so they can verify signatures:
                </p>
                <code className="text-sm text-[var(--foreground)] bg-white/5 px-2 py-1 rounded break-all">{generatedSecret}</code>
              </div>
              <GlassButton size="sm" variant="secondary" onClick={() => copyText(generatedSecret!)}>
                {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </GlassButton>
              <button onClick={() => setGeneratedSecret(null)} className="text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div className="glass p-6 w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--foreground)]">{editing ? 'Edit Webhook' : 'Configure Webhook'}</h3>
                <button onClick={() => setShowModal(false)} className="text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"><X size={20} /></button>
              </div>
              <form onSubmit={handleSave} className="space-y-3">
                <GlassDropdown
                  options={resellers.map((u) => ({ value: u.id, label: `${u.name} ${u.email ? `· ${u.email}` : ''}` }))}
                  value={form.userId}
                  onChange={(v) => setForm({ ...form, userId: v })}
                  disabled={!!editing}
                  placeholder="Select reseller"
                />
                <input className="glass-input w-full" placeholder="Endpoint URL (https://your-site.com/webhook)" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} required />
                <input className="glass-input w-full" placeholder={editing ? 'New signing secret (leave blank to keep current)' : 'Signing secret (required)'} value={form.secret} onChange={e => setForm({ ...form, secret: e.target.value })} type="text" autoComplete="off" />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[var(--muted)]">Events to subscribe to:</p>
                  <StatusBadge status={form.status} />
                  <select className="glass-input text-sm py-1 px-2" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 rounded-xl bg-white/5">
                  {ALL_EVENTS.map((ev) => (
                    <label key={ev} className="flex items-center gap-2 text-sm text-[var(--muted)] cursor-pointer">
                      <input type="checkbox" checked={form.events.includes(ev)} onChange={() => toggleEvent(ev)} className="accent-[var(--accent)]" />
                      <code className="text-xs">{ev}</code>
                    </label>
                  ))}
                </div>
                <div className="flex gap-3 pt-2">
                  <GlassButton type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancel</GlassButton>
                  <GlassButton type="submit" className="flex-1" disabled={saving}>
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Webhook size={16} />}
                    Save
                  </GlassButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        <ConfirmDialog
          open={!!showDelete}
          onClose={() => setShowDelete(null)}
          onConfirm={handleDelete}
          title="Delete Webhook"
          message={`Delete the webhook for ${showDelete?.reseller?.name}? Delivery history is removed.`}
          variant="danger"
          confirmLabel="Delete"
        />

        {webhooks.length === 0 ? (
          <GlassCard>
            <div className="flex flex-col items-center justify-center py-16">
              <Webhook size={40} className="mx-auto text-[var(--muted)] mb-3 opacity-50" />
              <p className="text-[var(--muted)]">No webhooks configured yet</p>
            </div>
          </GlassCard>
        ) : (
          webhooks.map((w, i) => (
            <motion.div key={w.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
              <GlassCard padding="p-0">
                <div className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-semibold text-[var(--foreground)]">{w.reseller?.name || 'Unknown reseller'}</p>
                      <StatusBadge status={w.status} />
                    </div>
                    <p className="text-xs text-[var(--muted)] mb-1">{w.reseller?.email} · {w.reseller?.role}</p>
                    <p className="text-sm text-[var(--foreground)] break-all"><code className="bg-white/5 px-2 py-0.5 rounded">{w.url}</code></p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-500">{w.deliveries.success} delivered</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-lg bg-red-500/10 text-red-500">{w.deliveries.failed} failed</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-500">{w.deliveries.pending} pending</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 text-[var(--muted)]">{w.events.length} events{!w.hasSecret ? ' · no secret' : ''}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <GlassButton size="sm" variant="secondary" onClick={() => handleTest(w)} disabled={testingId === w.id}>
                      {testingId === w.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      Test
                    </GlassButton>
                    <GlassButton size="sm" variant="secondary" onClick={() => loadDeliveries(w)}>
                      {loadingDeliveries === w.id ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                      {expanded === w.id ? 'Hide' : 'Log'}
                    </GlassButton>
                    <GlassButton size="sm" variant="secondary" onClick={() => handleToggleStatus(w)}>
                      {w.status === 'active' ? 'Disable' : 'Enable'}
                    </GlassButton>
                    <GlassButton size="sm" variant="secondary" onClick={() => openEdit(w)}>
                      Edit
                    </GlassButton>
                    <button className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 transition-colors cursor-pointer" title="Delete" onClick={() => setShowDelete(w)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {expanded === w.id && (
                  <div className="border-t border-[var(--card-border)] p-4 overflow-x-auto">
                    <table className="w-full text-sm min-w-[700px]">
                      <thead>
                        <tr className="border-b border-[var(--card-border)]">
                          <th className="text-left py-2 px-3 text-[var(--muted)] font-medium">Event</th>
                          <th className="text-left py-2 px-3 text-[var(--muted)] font-medium">Status</th>
                          <th className="text-right py-2 px-3 text-[var(--muted)] font-medium">Attempts</th>
                          <th className="text-right py-2 px-3 text-[var(--muted)] font-medium">HTTP</th>
                          <th className="text-left py-2 px-3 text-[var(--muted)] font-medium">Error</th>
                          <th className="text-left py-2 px-3 text-[var(--muted)] font-medium">Last Attempt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(deliveries[w.id] || []).length === 0 ? (
                          <tr><td colSpan={6} className="py-8 text-center text-[var(--muted)]">No deliveries yet</td></tr>
                        ) : (
                          (deliveries[w.id] || []).map((d) => (
                            <tr key={d.id} className="border-b border-[var(--card-border)]">
                              <td className="py-2 px-3"><code className="text-xs">{d.event}</code></td>
                              <td className="py-2 px-3"><StatusBadge status={d.status} /></td>
                              <td className="py-2 px-3 text-right text-[var(--foreground)]">{d.attempts}/{d.ttlAttempts}</td>
                              <td className="py-2 px-3 text-right text-[var(--muted)]">{d.responseCode ?? '—'}</td>
                              <td className="py-2 px-3 text-xs text-red-400 max-w-[280px] truncate">{d.error || '—'}</td>
                              <td className="py-2 px-3 text-xs text-[var(--muted)]">{d.lastAttemptAt ? new Date(d.lastAttemptAt).toLocaleString() : '—'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    {deliveries[w.id]?.some((d) => d.payload) && (
                      <details className="mt-2">
                        <summary className="text-xs text-[var(--muted)] cursor-pointer">Show latest payload</summary>
                        <pre className="mt-2 text-xs bg-white/5 p-3 rounded-lg overflow-x-auto">{deliveries[w.id]?.[0]?.payload}</pre>
                      </details>
                    )}
                  </div>
                )}
              </GlassCard>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}