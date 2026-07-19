'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassDropdown } from '@/components/ui/GlassDropdown'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useApi } from '@/hooks/useApi'
import { useToast } from '@/components/ui/Toast'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit, Trash2, Loader2, X, Plug, Wifi, WifiOff, Check, CircleAlert, FileCode } from 'lucide-react'
import Link from 'next/link'
import { useState, useCallback, useEffect, useRef } from 'react'

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

interface TestResult {
  websiteReachable?: boolean
  websiteMs?: number
  websiteError?: string
  hasApiKey: boolean
  apiMessage?: string
}

const emptySupplier = { name: '', email: '', phone: '', website: '', type: 'api', status: 'active', priority: '1', apiKey: '', config: '' }

export default function SuppliersPage() {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<SupplierItem | null>(null)
  const [form, setForm] = useState(emptySupplier)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { result: TestResult; ok: boolean; timestamp: number }>>({})
  const { toast } = useToast()
  const { data, loading, error, refetch } = useApi<{ suppliers: SupplierItem[] }>({ url: '/api/suppliers' })
  const suppliers = data?.suppliers || []
  const testTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    const timers = testTimers.current
    return () => {
      Object.values(timers).forEach(clearTimeout)
    }
  }, [])

  const handleTest = useCallback(async (supplier: SupplierItem) => {
    setTestingId(supplier.id)
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', id: supplier.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const ok = data.result.websiteReachable !== false
      setTestResults(prev => ({
        ...prev,
        [supplier.id]: { result: data.result, ok, timestamp: Date.now() },
      }))
      if (testTimers.current[supplier.id]) clearTimeout(testTimers.current[supplier.id])
      testTimers.current[supplier.id] = setTimeout(() => {
        setTestResults(prev => {
          const next = { ...prev }
          delete next[supplier.id]
          return next
        })
      }, 5000)
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Test failed')
    } finally {
      setTestingId(null)
    }
  }, [toast])

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

  const formatConfig = (config: string | null | undefined): Record<string, unknown> | null => {
    if (!config) return null
    try {
      const parsed = JSON.parse(config)
      return typeof parsed === 'object' && parsed !== null ? parsed : null
    } catch {
      return null
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
                  <GlassDropdown
                    options={[
                      { value: 'api', label: 'API' },
                      { value: 'manual', label: 'Manual' },
                      { value: 'reseller', label: 'Client' },
                    ]}
                    value={form.type}
                    onChange={(v) => setForm({ ...form, type: v })}
                  />
                  <GlassDropdown
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ]}
                    value={form.status}
                    onChange={(v) => setForm({ ...form, status: v })}
                  />
                  <div>
                    <label className="block text-xs text-[var(--muted)] mb-1">Priority</label>
                    <input className="glass-input w-full" type="number" min="1" max="10" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} />
                  </div>
                </div>
                <input className="glass-input w-full" placeholder="API Key (optional)" value={form.apiKey} onChange={e => setForm({ ...form, apiKey: e.target.value })} />
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1">JSON Config (optional)</label>
                  <textarea
                    className="glass-input w-full h-20 resize-none font-mono text-xs"
                    placeholder='{"baseUrl": "https://api.example.com", "timeout": 30}'
                    value={form.config}
                    onChange={e => setForm({ ...form, config: e.target.value })}
                  />
                </div>
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
          {suppliers.map((supplier: SupplierItem, i: number) => {
            const test = testResults[supplier.id]
            const isTesting = testingId === supplier.id
            const parsedConfig = formatConfig(supplier.config)

            return (
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

                  {/* Config info */}
                  {parsedConfig && (
                    <div className="mb-4 p-3 rounded-xl bg-white/5 dark:bg-white/5">
                      <div className="flex items-center gap-1.5 mb-2">
                        <FileCode size={12} className="text-[var(--muted)]" />
                        <span className="text-xs font-medium text-[var(--muted)]">Configuration</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {Object.entries(parsedConfig).slice(0, 6).map(([key, val]) => (
                          <div key={key} className="text-xs">
                            <span className="text-[var(--muted)]">{key}: </span>
                            <span className="text-[var(--foreground)] font-mono">{typeof val === 'string' ? val : JSON.stringify(val)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inline test result */}
                  <AnimatePresence>
                    {test && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 overflow-hidden"
                      >
                        <div className={`p-3 rounded-xl text-xs space-y-1 ${test.ok ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                          <div className="flex items-center gap-1.5 font-medium">
                            {test.ok ? <Check size={12} className="text-green-400" /> : <CircleAlert size={12} className="text-red-400" />}
                            <span className={test.ok ? 'text-green-400' : 'text-red-400'}>
                              {test.ok ? 'Connection OK' : 'Connection Failed'}
                            </span>
                            <span className="text-[var(--muted)] ml-auto">{new Date(test.timestamp).toLocaleTimeString()}</span>
                          </div>
                          {test.result.websiteReachable !== undefined && (
                            <p className="text-[var(--muted)]">
                              Website: {test.result.websiteReachable ? `Reachable (${test.result.websiteMs}ms)` : `Unreachable — ${test.result.websiteError || 'timeout'}`}
                            </p>
                          )}
                          {test.result.hasApiKey && (
                            <p className="text-[var(--muted)]">{test.result.apiMessage}</p>
                          )}
                          {!test.result.websiteReachable && !test.result.hasApiKey && (
                            <p className="text-[var(--muted)]">No website or API key configured</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-2 pt-3 border-t border-[var(--card-border)]">
                    <GlassButton
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleTest(supplier)}
                      disabled={isTesting}
                    >
                      {isTesting ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : supplier.status === 'active' ? (
                        <Wifi size={14} />
                      ) : (
                        <WifiOff size={14} />
                      )}
                      Test
                    </GlassButton>
                    <GlassButton variant="secondary" size="sm" className="flex-1" onClick={() => openEdit(supplier)}><Edit size={14} /> Edit</GlassButton>
                    <GlassButton variant="danger" size="sm" onClick={() => handleDelete(supplier.id, supplier.name)} disabled={deleting === supplier.id}>
                      {deleting === supplier.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </GlassButton>
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
