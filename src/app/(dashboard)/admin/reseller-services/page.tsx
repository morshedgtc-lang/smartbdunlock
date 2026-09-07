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
import { Network, Plus, Trash2, Loader2, X, Tag } from 'lucide-react'
import { useState } from 'react'

interface Reseller {
  id: string
  email: string
  name: string
  status: string
}

interface ServiceSummary {
  id: string
  name: string
  type: string
  sellingPrice: number
  cost: number
  status: string
}

interface ResellerServiceConfig {
  id: string
  userId: string
  serviceId: string
  price: number | null
  enabled: boolean
  updatedAt: string
  user: { id: string; name: string; email: string }
  service: { id: string; name: string; type: string; sellingPrice: number }
}

export default function ResellerServicesPage() {
  const { toast } = useToast()
  const { data, loading, error, refetch } = useApi<{ services: ServiceSummary[]; configs: ResellerServiceConfig[] }>({ url: '/api/reseller-services' })
  const { data: resellersData } = useApi<{ users: Reseller[] }>({ url: '/api/users?role=reseller&limit=1000' })
  const resellers = resellersData?.users || []
  const services = data?.services || []
  const configs = data?.configs || []

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ userId: '', serviceId: '', price: '' as string, enabled: true })
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ResellerServiceConfig | null>(null)

  const openModal = () => {
    setForm({ userId: '', serviceId: '', price: '', enabled: true })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/reseller-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: form.userId,
          serviceId: form.serviceId,
          price: form.price === '' ? null : Number(form.price),
          enabled: form.enabled,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast('success', 'Reseller service saved')
      setShowModal(false)
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch('/api/reseller-services', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: deleteTarget.userId, serviceId: deleteTarget.serviceId }),
      })
      if (!res.ok) throw new Error('Failed to remove')
      toast('success', 'Config removed — reseller now sees the standard catalog')
      setDeleteTarget(null)
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
    }
  }

  const handleToggle = async (c: ResellerServiceConfig) => {
    try {
      const res = await fetch('/api/reseller-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: c.userId, serviceId: c.serviceId, price: c.price, enabled: !c.enabled }),
      })
      if (!res.ok) throw new Error('Failed to toggle')
      toast('success', c.enabled ? 'Override disabled' : 'Override enabled')
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
    }
  }

  if (loading) {
    return (
      <div>
        <Header title="Reseller Services" subtitle="Loading..." />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Header title="Reseller Services" />
        <div className="p-6 flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Reseller Services" subtitle="Per-reseller service visibility & pricing" />
      <div className="p-6 space-y-6">
        <div className="flex justify-end">
          <GlassButton size="sm" onClick={openModal}>
            <Plus size={16} /> Add Override
          </GlassButton>
        </div>

        <GlassCard>
          <p className="text-sm text-[var(--muted)] leading-relaxed">
            Resellers with no overrides see the full active catalog at the standard selling price. Once you add an
            override for a service, that reseller will only be able to order <span className="text-[var(--foreground)]">enabled</span> overrides,
            at the override price (or the standard price if left blank).
          </p>
        </GlassCard>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div className="glass p-6 w-full max-w-md mx-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--foreground)]">Add Reseller Service Override</h3>
                <button onClick={() => setShowModal(false)} className="text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"><X size={20} /></button>
              </div>
              <form onSubmit={handleSave} className="space-y-3">
                <GlassDropdown
                  label="Reseller"
                  options={resellers.map((u) => ({ value: u.id, label: `${u.name} ${u.email ? `· ${u.email}` : ''}` }))}
                  value={form.userId}
                  onChange={(v) => setForm({ ...form, userId: v })}
                  placeholder="Select reseller"
                />
                <GlassDropdown
                  label="Service"
                  options={services.map((s) => ({ value: s.id, label: `${s.name} · $${s.sellingPrice}` }))}
                  value={form.serviceId}
                  onChange={(v) => setForm({ ...form, serviceId: v })}
                  placeholder="Select service"
                />
                <input className="glass-input w-full" type="number" step="0.01" min="0" placeholder="Override price (blank = standard selling price)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                <label className="flex items-center gap-2 text-sm text-[var(--muted)] cursor-pointer">
                  <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="accent-[var(--accent)]" />
                  Enabled (reseller can order this service)
                </label>
                <div className="flex gap-3 pt-2">
                  <GlassButton type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancel</GlassButton>
                  <GlassButton type="submit" className="flex-1" disabled={saving}>
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Tag size={16} />}
                    Save
                  </GlassButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Remove Override"
          message={`Remove "${deleteTarget?.service.name}" override for ${deleteTarget?.user.name}? The reseller will fall back to the standard catalog.`}
          variant="danger"
          confirmLabel="Remove"
        />

        {configs.length === 0 ? (
          <GlassCard>
            <div className="flex flex-col items-center justify-center py-16">
              <Network size={40} className="mx-auto text-[var(--muted)] mb-3 opacity-50" />
              <p className="text-[var(--muted)]">No overrides yet — all resellers use the full catalog</p>
            </div>
          </GlassCard>
        ) : (
          <GlassCard padding="p-0">
            <div className="table-responsive">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-[var(--card-border)]">
                    <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Reseller</th>
                    <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Service</th>
                    <th className="text-right py-4 px-4 text-[var(--muted)] font-medium">Override Price</th>
                    <th className="text-right py-4 px-4 text-[var(--muted)] font-medium">Standard Price</th>
                    <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Status</th>
                    <th className="text-right py-4 px-4 text-[var(--muted)] font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {configs.map((c, i) => (
                    <motion.tr key={c.id} className="border-b border-[var(--card-border)] hover:bg-white/5 transition-colors" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                      <td className="py-3 px-4">
                        <p className="font-medium text-[var(--foreground)]">{c.user.name}</p>
                        <p className="text-xs text-[var(--muted)]">{c.user.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-[var(--foreground)]">{c.service.name}</p>
                        <p className="text-xs text-[var(--muted)]">{c.service.type}</p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {c.price === null ? (
                          <span className="text-[var(--muted)]">—</span>
                        ) : (
                          <span className="font-medium text-[var(--accent)]">${c.price}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-[var(--muted)]">${c.service.sellingPrice}</td>
                      <td className="py-3 px-4"><StatusBadge status={c.enabled ? 'active' : 'disabled'} /></td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <GlassButton size="sm" variant="secondary" onClick={() => handleToggle(c)}>
                            {c.enabled ? 'Disable' : 'Enable'}
                          </GlassButton>
                          <button className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 transition-colors cursor-pointer" title="Remove" onClick={() => setDeleteTarget(c)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  )
}