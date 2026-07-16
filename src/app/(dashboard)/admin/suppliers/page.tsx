'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useApi } from '@/hooks/useApi'
import { useToast } from '@/components/ui/Toast'
import { motion } from 'framer-motion'
import { Plus, Edit, Trash2, Loader2, X, Plug, Wifi, WifiOff } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface SupplierItem {
  id: string
  name: string
  email?: string
  phone?: string
  website?: string
  type: string
  status: string
  priority: number
  apiKey?: string
  config?: string
  successRate: number
  totalOrders: number
}

const emptySupplier = { name: '', email: '', phone: '', website: '', type: 'api', status: 'active', priority: '1', apiKey: '', config: '' }

export default function SuppliersPage() {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<SupplierItem | null>(null)
  const [form, setForm] = useState(emptySupplier)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)
  const { toast } = useToast()
  const { data, loading, error, refetch } = useApi<{ suppliers: SupplierItem[] }>({ url: '/api/suppliers' })
  const suppliers = data?.suppliers || []

  const openCreate = () => { setEditing(null); setForm(emptySupplier); setShowModal(true) }
  const openEdit = (supplier: SupplierItem) => {
    setEditing(supplier)
    setForm({
      name: supplier.name,
      email: supplier.email || '',
      phone: supplier.phone || '',
      website: supplier.website || '',
      type: supplier.type,
      status: supplier.status,
      priority: String(supplier.priority),
      apiKey: supplier.apiKey || '',
      config: supplier.config || '',
    })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body = { ...form, priority: parseInt(form.priority) }
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch('/api/suppliers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { id: editing.id, ...body } : body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast('success', editing ? 'Supplier updated' : 'Supplier created')
      setShowModal(false)
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    setConfirmDelete({ id, name })
  }

  const confirmDeleteSupplier = async () => {
    if (!confirmDelete) return
    setDeleting(confirmDelete.id)
    try {
      const res = await fetch('/api/suppliers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: confirmDelete.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast('success', 'Supplier deleted')
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
    } finally {
      setDeleting(null)
      setConfirmDelete(null)
    }
  }

  if (loading) {
    return (
      <div>
        <Header title="Suppliers" subtitle="Loading..." />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Header title="Suppliers" />
        <div className="p-6 flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-red-400 text-sm">{error}</p>
          <Link href="/login" className="text-[var(--accent)] text-sm hover:underline">Go to Login</Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmDeleteSupplier}
        title="Delete Supplier"
        message={`Delete supplier "${confirmDelete?.name}"? This action cannot be undone.`}
        variant="danger"
        loading={!!deleting}
      />
      <Header title="Suppliers" subtitle="Manage supplier connections" />
      <div className="p-6 space-y-6">
        <div className="flex justify-end">
          <GlassButton size="sm" onClick={openCreate}><Plus size={16} /> Add Supplier</GlassButton>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div className="glass p-6 w-full max-w-lg mx-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--foreground)]">{editing ? 'Edit Supplier' : 'Add Supplier'}</h3>
                <button onClick={() => setShowModal(false)} className="text-[var(--muted)] hover:text-[var(--foreground)]"><X size={20} /></button>
              </div>
              <form onSubmit={handleSave} className="space-y-3">
                <input className="glass-input w-full" placeholder="Supplier name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                <div className="grid grid-cols-2 gap-3">
                  <input className="glass-input" type="email" placeholder="Email (optional)" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  <input className="glass-input" placeholder="Phone (optional)" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <input className="glass-input w-full" placeholder="Website URL (optional)" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} />
                <div className="grid grid-cols-3 gap-3">
                  <select className="glass-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="api">API</option>
                    <option value="manual">Manual</option>
                    <option value="reseller">Client</option>
                  </select>
                  <select className="glass-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <div>
                    <label className="block text-xs text-[var(--muted)] mb-1">Priority</label>
                    <input className="glass-input w-full" type="number" min="1" max="10" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} />
                  </div>
                </div>
                <input className="glass-input w-full" placeholder="API Key (optional)" value={form.apiKey} onChange={e => setForm({ ...form, apiKey: e.target.value })} />
                <div className="flex gap-3 pt-2">
                  <GlassButton type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancel</GlassButton>
                  <GlassButton type="submit" className="flex-1" disabled={saving}>
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Plug size={16} />}
                    {editing ? 'Update' : 'Create'}
                  </GlassButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Supplier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suppliers.map((supplier: SupplierItem, i: number) => (
            <motion.div key={supplier.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <GlassCard className="h-full">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-[var(--foreground)] text-lg">{supplier.name}</h3>
                    <p className="text-xs text-[var(--muted)] font-mono mt-1">{supplier.apiKey ? '••••••••' : 'No API key'}</p>
                  </div>
                  <StatusBadge status={supplier.status} />
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="text-center p-3 rounded-xl bg-white/5 dark:bg-white/5">
                    <p className="text-2xl font-bold text-[var(--foreground)]">{supplier.successRate}%</p>
                    <p className="text-xs text-[var(--muted)]">Success Rate</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-white/5 dark:bg-white/5">
                    <p className="text-2xl font-bold text-[var(--foreground)]">{supplier.totalOrders.toLocaleString()}</p>
                    <p className="text-xs text-[var(--muted)]">Total Orders</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm mb-4">
                  <span className="text-[var(--muted)]">Priority</span>
                  <span className="font-medium text-[var(--foreground)]">#{supplier.priority}</span>
                </div>
                <div className="flex gap-2 pt-3 border-t border-[var(--card-border)]">
                  <GlassButton variant="secondary" size="sm" className="flex-1" onClick={() => toast('info', 'Test connection — coming soon')}>
                    {supplier.status === 'active' ? <Wifi size={14} /> : <WifiOff size={14} />} Test
                  </GlassButton>
                  <GlassButton variant="secondary" size="sm" className="flex-1" onClick={() => openEdit(supplier)}><Edit size={14} /> Edit</GlassButton>
                  <GlassButton variant="danger" size="sm" onClick={() => handleDelete(supplier.id, supplier.name)} disabled={deleting === supplier.id}>
                    {deleting === supplier.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </GlassButton>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
