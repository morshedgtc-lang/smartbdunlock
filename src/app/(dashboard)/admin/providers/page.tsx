'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { StatCard } from '@/components/ui/StatCard'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useApi } from '@/hooks/useApi'
import { useToast } from '@/components/ui/Toast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Edit, Trash2, Loader2, X, Plug, Wifi, WifiOff,
  Check, CircleAlert, RefreshCw, Globe, Server, KeyRound,
  Clock, Zap, Activity, ArrowUpDown,
} from 'lucide-react'
import { useState, useCallback, useEffect, useRef } from 'react'
import { timeAgo } from '@/lib/utils'

interface ProviderItem {
  id: string
  name: string
  apiUrl?: string
  apiKey?: string
  ipAddress?: string
  website?: string
  email?: string
  phone?: string
  syncInterval: number
  config?: string
  priority: number
  status: string
  lastSyncAt?: string
  _count?: { services: number }
  services?: { id: string; status: string }[]
}

interface TestResult {
  reachable?: boolean
  latencyMs?: number
  error?: string
  apiReachable?: boolean
  message?: string
}

interface SyncResult {
  synced: number
  new: number
  updated: number
  failed: number
  errors?: string[]
}

interface ProvidersResponse {
  providers: ProviderItem[]
}

const emptyForm = {
  name: '',
  apiUrl: '',
  apiKey: '',
  ipAddress: '',
  website: '',
  email: '',
  phone: '',
  syncInterval: '10',
  config: '',
  priority: '1',
}

export default function ProvidersPage() {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<ProviderItem | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { result: TestResult; ok: boolean; timestamp: number }>>({})
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [syncResults, setSyncResults] = useState<Record<string, { result: SyncResult; timestamp: number }>>({})
  const { toast } = useToast()
  const { data, loading, error, refetch } = useApi<ProvidersResponse>({ url: '/api/providers' })
  const providers = data?.providers || []
  const testTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const syncTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    const testTimersSnapshot = testTimers.current
    const syncTimersSnapshot = syncTimers.current
    return () => {
      Object.values(testTimersSnapshot).forEach(clearTimeout)
      Object.values(syncTimersSnapshot).forEach(clearTimeout)
    }
  }, [])

  const totalServices = providers.reduce((sum: number, p: ProviderItem) => sum + (p._count?.services || 0), 0)
  const activeCount = providers.filter((p: ProviderItem) => p.status === 'active').length
  const pendingServices = providers.reduce(
    (sum: number, p: ProviderItem) => sum + (p.services?.filter((s) => s.status === 'pending').length || 0),
    0,
  )

  const handleTest = useCallback(async (provider: ProviderItem) => {
    setTestingId(provider.id)
    try {
      const res = await fetch(`/api/providers/${provider.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const ok = data.result?.reachable !== false && data.result?.error === undefined
      setTestResults((prev) => ({
        ...prev,
        [provider.id]: { result: data.result, ok, timestamp: Date.now() },
      }))
      if (testTimers.current[provider.id]) clearTimeout(testTimers.current[provider.id])
      testTimers.current[provider.id] = setTimeout(() => {
        setTestResults((prev) => {
          const next = { ...prev }
          delete next[provider.id]
          return next
        })
      }, 8000)
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Test failed')
    } finally {
      setTestingId(null)
    }
  }, [toast])

  const handleSync = useCallback(async (provider: ProviderItem) => {
    setSyncingId(provider.id)
    try {
      const res = await fetch(`/api/providers/${provider.id}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSyncResults((prev) => ({
        ...prev,
        [provider.id]: { result: data.result, timestamp: Date.now() },
      }))
      toast('success', `Sync complete: ${data.result?.new || 0} new, ${data.result?.updated || 0} updated, ${data.result?.failed || 0} failed`)
      if (syncTimers.current[provider.id]) clearTimeout(syncTimers.current[provider.id])
      syncTimers.current[provider.id] = setTimeout(() => {
        setSyncResults((prev) => {
          const next = { ...prev }
          delete next[provider.id]
          return next
        })
      }, 8000)
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncingId(null)
    }
  }, [toast, refetch])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (provider: ProviderItem) => {
    setEditing(provider)
    setForm({
      name: provider.name,
      apiUrl: provider.apiUrl || '',
      apiKey: provider.apiKey || '',
      ipAddress: provider.ipAddress || '',
      website: provider.website || '',
      email: provider.email || '',
      phone: provider.phone || '',
      syncInterval: String(provider.syncInterval || 10),
      config: provider.config || '',
      priority: String(provider.priority || 1),
    })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        name: form.name,
        apiUrl: form.apiUrl || undefined,
        apiKey: form.apiKey,
        ipAddress: form.ipAddress || undefined,
        website: form.website || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        syncInterval: parseInt(form.syncInterval) || 10,
        config: form.config || undefined,
        priority: parseInt(form.priority) || 1,
      }
      if (editing) {
        const res = await fetch(`/api/providers/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        toast('success', 'Provider updated')
      } else {
        const res = await fetch('/api/providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        toast('success', 'Provider created')
      }
      setShowModal(false)
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (id: string, name: string) => {
    setConfirmDelete({ id, name })
  }

  const confirmDeleteProvider = async () => {
    if (!confirmDelete) return
    setDeleting(confirmDelete.id)
    try {
      const res = await fetch(`/api/providers/${confirmDelete.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast('success', 'Provider deleted')
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

  const maskApiKey = (key?: string) => {
    if (!key) return 'No API key'
    if (key.length <= 8) return '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'
    return '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'
  }

  if (loading) {
    return (
      <div>
        <Header title="API Providers" subtitle="Loading..." />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Header title="API Providers" />
        <div className="p-6 flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmDeleteProvider}
        title="Delete Provider"
        message={`Delete provider "${confirmDelete?.name}"? This will remove all associated API connections. This action cannot be undone.`}
        variant="danger"
        loading={!!deleting}
      />
      <Header title="API Providers" subtitle="Manage supplier API connections" />
      <div className="p-6 space-y-6">
        {/* Stats Row */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <StatCard title="Total Providers" value={providers.length} icon={Server} color="blue" />
          <StatCard title="Active" value={activeCount} icon={Plug} color="green" />
          <StatCard title="Total Services" value={totalServices} icon={Activity} color="purple" />
          <StatCard title="Pending Services" value={pendingServices} icon={Clock} color="amber" />
        </motion.div>

        {/* Add Provider Button */}
        <div className="flex justify-end">
          <GlassButton size="sm" onClick={openCreate}>
            <Plus size={16} /> Add Provider
          </GlassButton>
        </div>

        {/* Create / Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
              className="glass p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--foreground)]">
                  {editing ? 'Edit Provider' : 'Add Provider'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSave} className="space-y-3">
                <input
                  className="glass-input w-full"
                  placeholder="Provider name *"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                <input
                  className="glass-input w-full"
                  placeholder="API URL (e.g. https://api.example.com)"
                  value={form.apiUrl}
                  onChange={(e) => setForm({ ...form, apiUrl: e.target.value })}
                />
                <input
                  className="glass-input w-full"
                  placeholder="API Key *"
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  required
                />
                <input
                  className="glass-input w-full"
                  placeholder="IP Address (optional)"
                  value={form.ipAddress}
                  onChange={(e) => setForm({ ...form, ipAddress: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="glass-input"
                    type="email"
                    placeholder="Email (optional)"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                  <input
                    className="glass-input"
                    placeholder="Phone (optional)"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <input
                  className="glass-input w-full"
                  placeholder="Website URL (optional)"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[var(--muted)] mb-1">Sync Interval (min)</label>
                    <input
                      className="glass-input w-full"
                      type="number"
                      min="1"
                      max="1440"
                      value={form.syncInterval}
                      onChange={(e) => setForm({ ...form, syncInterval: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--muted)] mb-1">Priority</label>
                    <input
                      className="glass-input w-full"
                      type="number"
                      min="1"
                      max="10"
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1">JSON Config (optional)</label>
                  <textarea
                    className="glass-input w-full h-20 resize-none font-mono text-xs"
                    placeholder='{"baseUrl": "https://api.example.com", "timeout": 30}'
                    value={form.config}
                    onChange={(e) => setForm({ ...form, config: e.target.value })}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <GlassButton type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>
                    Cancel
                  </GlassButton>
                  <GlassButton type="submit" className="flex-1" disabled={saving}>
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Plug size={16} />}
                    {editing ? 'Update' : 'Create'}
                  </GlassButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Provider Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providers.map((provider: ProviderItem, i: number) => {
            const test = testResults[provider.id]
            const isTesting = testingId === provider.id
            const sync = syncResults[provider.id]
            const isSyncing = syncingId === provider.id
            const parsedConfig = formatConfig(provider.config)
            const serviceCount = provider._count?.services || 0
            const providerPending = provider.services?.filter((s) => s.status === 'pending').length || 0

            return (
              <motion.div
                key={provider.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <GlassCard className="h-full">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-[var(--foreground)] text-lg">{provider.name}</h3>
                      <p className="text-xs text-[var(--muted)] font-mono mt-1">{maskApiKey(provider.apiKey)}</p>
                    </div>
                    <StatusBadge status={provider.status} />
                  </div>

                  {/* Info Grid */}
                  <div className="space-y-2 mb-4">
                    {provider.ipAddress && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--muted)] flex items-center gap-1.5">
                          <Globe size={12} /> IP Address
                        </span>
                        <span className="font-mono text-[var(--foreground)] text-xs">{provider.ipAddress}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--muted)] flex items-center gap-1.5">
                        <ArrowUpDown size={12} /> Sync Interval
                      </span>
                      <span className="text-[var(--foreground)]">{provider.syncInterval || 10} min</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--muted)] flex items-center gap-1.5">
                        <Clock size={12} /> Last Sync
                      </span>
                      <span className="text-[var(--foreground)]">{timeAgo(provider.lastSyncAt)}</span>
                    </div>
                  </div>

                  {/* Service Counts */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="text-center p-3 rounded-xl bg-white/5 dark:bg-white/5">
                      <p className="text-2xl font-bold text-[var(--foreground)]">{serviceCount}</p>
                      <p className="text-xs text-[var(--muted)]">Total Services</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-white/5 dark:bg-white/5">
                      <p className="text-2xl font-bold text-[var(--foreground)]">{providerPending}</p>
                      <p className="text-xs text-[var(--muted)]">Pending Services</p>
                    </div>
                  </div>

                  {/* Config Info */}
                  {parsedConfig && (
                    <div className="mb-4 p-3 rounded-xl bg-white/5 dark:bg-white/5">
                      <div className="flex items-center gap-1.5 mb-2">
                        <KeyRound size={12} className="text-[var(--muted)]" />
                        <span className="text-xs font-medium text-[var(--muted)]">Configuration</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {Object.entries(parsedConfig)
                          .slice(0, 6)
                          .map(([key, val]) => (
                            <div key={key} className="text-xs">
                              <span className="text-[var(--muted)]">{key}: </span>
                              <span className="text-[var(--foreground)] font-mono">
                                {typeof val === 'string' ? val : JSON.stringify(val)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Inline Test Result */}
                  <AnimatePresence>
                    {test && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 overflow-hidden"
                      >
                        <div
                          className={`p-3 rounded-xl text-xs space-y-1 ${
                            test.ok
                              ? 'bg-green-500/10 border border-green-500/20'
                              : 'bg-red-500/10 border border-red-500/20'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-medium">
                            {test.ok ? (
                              <Check size={12} className="text-green-400" />
                            ) : (
                              <CircleAlert size={12} className="text-red-400" />
                            )}
                            <span className={test.ok ? 'text-green-400' : 'text-red-400'}>
                              {test.ok ? 'Connection OK' : 'Connection Failed'}
                            </span>
                            <span className="text-[var(--muted)] ml-auto">
                              {new Date(test.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          {test.result.reachable !== undefined && (
                            <p className="text-[var(--muted)]">
                              {test.result.reachable
                                ? `Reachable (${test.result.latencyMs || 0}ms)`
                                : `Unreachable \u2014 ${test.result.error || 'timeout'}`}
                            </p>
                          )}
                          {test.result.apiReachable !== undefined && (
                            <p className="text-[var(--muted)]">
                              API: {test.result.apiReachable ? 'Responding' : 'Not responding'}{' '}
                              {test.result.message && `\u2014 ${test.result.message}`}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Inline Sync Result */}
                  <AnimatePresence>
                    {sync && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 overflow-hidden"
                      >
                        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Zap size={12} className="text-blue-400" />
                            <span className="text-blue-400">Sync Complete</span>
                            <span className="text-[var(--muted)] ml-auto">
                              {new Date(sync.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-[var(--muted)]">
                            New: {sync.result.new} | Updated: {sync.result.updated} | Failed: {sync.result.failed}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-3 border-t border-[var(--card-border)]">
                    <GlassButton
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleTest(provider)}
                      disabled={isTesting}
                    >
                      {isTesting ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : provider.status === 'active' ? (
                        <Wifi size={14} />
                      ) : (
                        <WifiOff size={14} />
                      )}
                      Test
                    </GlassButton>
                    <GlassButton
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleSync(provider)}
                      disabled={isSyncing}
                    >
                      {isSyncing ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <RefreshCw size={14} />
                      )}
                      Sync
                    </GlassButton>
                    <GlassButton
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEdit(provider)}
                    >
                      <Edit size={14} /> Edit
                    </GlassButton>
                    <GlassButton
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(provider.id, provider.name)}
                      disabled={deleting === provider.id}
                    >
                      {deleting === provider.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </GlassButton>
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>

        {providers.length === 0 && (
          <div className="text-center py-16">
            <Server size={48} className="mx-auto text-[var(--muted)] mb-4 opacity-40" />
            <p className="text-lg font-bold text-[var(--foreground)]">No providers yet</p>
            <p className="text-sm text-[var(--muted)] mt-1">Add your first API provider to start syncing services.</p>
            <GlassButton size="sm" className="mt-4" onClick={openCreate}>
              <Plus size={16} /> Add Provider
            </GlassButton>
          </div>
        )}
      </div>
    </div>
  )
}
