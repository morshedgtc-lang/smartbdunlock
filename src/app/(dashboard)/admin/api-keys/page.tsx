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
import { Key, Plus, Trash2, Loader2, X, Copy, CheckCircle, Ban, RefreshCw } from 'lucide-react'
import { useState } from 'react'

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  userId: string
  status: string
  permissions: string
  requestLimit: number
  totalRequests: number
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
  owner: KeyOwner | null
}

interface KeyOwner {
  id: string
  userId: string
  email: string
  name: string
  role: string
}

interface Reseller {
  id: string
  userId: string
  email: string
  name: string
  role: string
  status: string
}

export default function ApiKeysPage() {
  const [showModal, setShowModal] = useState(false)
  const [showRevokeDialog, setShowRevokeDialog] = useState(false)
  const [showDisableDialog, setShowDisableDialog] = useState(false)
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false)
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({ name: '', permissions: 'read', requestLimit: 100, userId: '' })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const { data, loading, error, refetch } = useApi<{ apiKeys: ApiKey[] }>({ url: '/api/api-keys' })
  const apiKeys = data?.apiKeys || []

  const { data: resellersData } = useApi<{ users: Reseller[] }>({ url: '/api/users?role=reseller&limit=1000' })
  const resellers = resellersData?.users || []

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, userId: form.userId || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setNewKey(data.key)
      setForm({ name: '', permissions: 'read', requestLimit: 100, userId: '' })
      toast('success', 'API key generated — copy it now, it won\'t be shown again')
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleRevoke = async () => {
    if (!selectedKey) return
    try {
      const res = await fetch('/api/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedKey.id }),
      })
      if (!res.ok) throw new Error('Failed to revoke')
      toast('success', 'API key revoked')
      setShowRevokeDialog(false)
      setSelectedKey(null)
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
    }
  }

  const handleDisable = async () => {
    if (!selectedKey) return
    try {
      const res = await fetch('/api/api-keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedKey.id, status: 'disabled' }),
      })
      if (!res.ok) throw new Error('Failed to disable')
      toast('success', 'API key disabled')
      setShowDisableDialog(false)
      setSelectedKey(null)
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
    }
  }

  const handleRegenerate = async () => {
    if (!selectedKey) return
    try {
      const res = await fetch('/api/api-keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedKey.id, action: 'regenerate' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to regenerate')
      setNewKey(data.key)
      toast('success', 'API key regenerated — copy it now, it won\'t be shown again')
      setShowRegenerateDialog(false)
      setSelectedKey(null)
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
    }
  }

  const copyKey = () => {
    if (!newKey) return
    navigator.clipboard.writeText(newKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const permissionLabels: Record<string, string> = { read: 'Read', write: 'Write', admin: 'Admin' }

  if (loading) {
    return (
      <div>
        <Header title="API Keys" subtitle="Loading..." />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Header title="API Keys" />
        <div className="p-6 flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="API Keys" subtitle={`${apiKeys.length} keys total`} />
      <div className="p-6 space-y-6">
        {newKey && (
          <motion.div
            className="glass-premium p-4 border border-emerald-500/20"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3">
              <CheckCircle size={20} className="text-emerald-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--muted)] mb-1">Your new API key (copy it now — it won&apos;t be shown again):</p>
                <code className="text-sm text-[var(--foreground)] bg-white/5 px-2 py-1 rounded break-all">{newKey}</code>
              </div>
              <GlassButton size="sm" variant="secondary" onClick={copyKey}>
                {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </GlassButton>
              <button onClick={() => setNewKey(null)} className="text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}

        <div className="flex justify-end">
          <GlassButton size="sm" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Generate New Key
          </GlassButton>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div className="glass p-6 w-full max-w-md mx-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--foreground)]">Generate New API Key</h3>
                <button onClick={() => setShowModal(false)} className="text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"><X size={20} /></button>
              </div>
              <form onSubmit={handleGenerate} className="space-y-3">
                <input className="glass-input w-full" placeholder="Key name (e.g. Production Server)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                <GlassDropdown
                  options={[
                    { value: 'read', label: 'Read Only' },
                    { value: 'write', label: 'Read & Write' },
                    { value: 'admin', label: 'Full Admin' },
                  ]}
                  value={form.permissions}
                  onChange={(v) => setForm({ ...form, permissions: v })}
                />
                <GlassDropdown
                  options={[
                    { value: '', label: 'Platform (Admin)' },
                    ...resellers.map(u => ({ value: u.id, label: `${u.name} ${u.email ? `· ${u.email}` : ''}` })),
                  ]}
                  value={form.userId || ''}
                  onChange={(v) => setForm({ ...form, userId: v })}
                  disabled={resellers.length === 0}
                />
                <p className="text-xs text-[var(--muted)]">Orders placed with this key are charged to the selected reseller&apos;s wallet.</p>
                <input className="glass-input w-full" type="number" placeholder="Request limit (per minute)" value={form.requestLimit} onChange={e => setForm({ ...form, requestLimit: parseInt(e.target.value) || 100 })} min={1} max={10000} />
                <div className="flex gap-3 pt-2">
                  <GlassButton type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancel</GlassButton>
                  <GlassButton type="submit" className="flex-1" disabled={saving}>
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
                    Generate
                  </GlassButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        <ConfirmDialog
          open={showRevokeDialog}
          onClose={() => { setShowRevokeDialog(false); setSelectedKey(null) }}
          onConfirm={handleRevoke}
          title="Revoke API Key"
          message={`Are you sure you want to revoke "${selectedKey?.name}"? This action cannot be undone.`}
          variant="danger"
          confirmLabel="Revoke"
        />

        <ConfirmDialog
          open={showDisableDialog}
          onClose={() => { setShowDisableDialog(false); setSelectedKey(null) }}
          onConfirm={handleDisable}
          title="Disable API Key"
          message={`Are you sure you want to disable "${selectedKey?.name}"? The key can be re-enabled later.`}
          variant="warning"
          confirmLabel="Disable"
        />

        <ConfirmDialog
          open={showRegenerateDialog}
          onClose={() => { setShowRegenerateDialog(false); setSelectedKey(null) }}
          onConfirm={handleRegenerate}
          title="Regenerate API Key"
          message={`Regenerate "${selectedKey?.name}"? The old key will stop working immediately. You'll see the new key once.`}
          variant="warning"
          confirmLabel="Regenerate"
        />

        <GlassCard padding="p-0">
          <div className="table-responsive">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Name</th>
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Owner</th>
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Key Prefix</th>
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Status</th>
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Permissions</th>
                  <th className="text-right py-4 px-4 text-[var(--muted)] font-medium">Req. Limit</th>
                  <th className="text-right py-4 px-4 text-[var(--muted)] font-medium">Usage</th>
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Last Used</th>
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Created</th>
                  <th className="text-right py-4 px-4 text-[var(--muted)] font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <Key size={40} className="mx-auto text-[var(--muted)] mb-3 opacity-50" />
                      <p className="text-[var(--muted)]">No API keys yet</p>
                    </td>
                  </tr>
                ) : (
                  apiKeys.map((key, i) => (
                    <motion.tr key={key.id} className="border-b border-[var(--card-border)] hover:bg-white/5 dark:hover:bg-white/5 transition-colors" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                      <td className="py-3 px-4">
                        <p className="font-medium text-[var(--foreground)]">{key.name}</p>
                      </td>
                      <td className="py-3 px-4">
                        {key.owner ? (
                          <div className="min-w-0">
                            <p className="text-sm text-[var(--foreground)] truncate font-medium">{key.owner.name}</p>
                            <p className="text-xs text-[var(--muted)] truncate">
                              {key.owner.role === 'admin' ? 'Platform Admin' : key.owner.email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-[var(--muted)]">Admin (Platform)</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-xs text-[var(--muted)] bg-white/5 px-2 py-1 rounded">{key.keyPrefix}</code>
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={key.status} /></td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-medium px-2 py-1 rounded-lg bg-white/5 dark:bg-white/5">{permissionLabels[key.permissions] || key.permissions}</span>
                      </td>
                      <td className="py-3 px-4 text-right text-[var(--foreground)]">{key.requestLimit}/min</td>
                      <td className="py-3 px-4 text-right text-[var(--foreground)]">{key.totalRequests.toLocaleString()}</td>
                      <td className="py-3 px-4 text-[var(--muted)] text-xs">
                        {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}
                      </td>
                      <td className="py-3 px-4 text-[var(--muted)] text-xs">
                        {new Date(key.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          {key.status === 'active' && (
                            <>
                              <button className="p-1.5 rounded-lg hover:bg-amber-500/10 text-[var(--muted)] hover:text-amber-500 transition-colors cursor-pointer" title="Regenerate" onClick={() => { setSelectedKey(key); setShowRegenerateDialog(true) }}>
                                <RefreshCw size={14} />
                              </button>
                              <button className="p-1.5 rounded-lg hover:bg-orange-500/10 text-[var(--muted)] hover:text-orange-500 transition-colors cursor-pointer" title="Disable" onClick={() => { setSelectedKey(key); setShowDisableDialog(true) }}>
                                <Ban size={14} />
                              </button>
                              <button className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 transition-colors cursor-pointer" title="Revoke" onClick={() => { setSelectedKey(key); setShowRevokeDialog(true) }}>
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
