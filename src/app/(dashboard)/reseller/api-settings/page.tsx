'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { useApi } from '@/hooks/useApi'
import { csrfFetch } from '@/lib/csrf-client'
import {
  Loader2, Key, Webhook, ShieldAlert, Info, Eye, EyeOff, RefreshCw, Copy, Send, CheckCircle, X, PlusCircle,
} from 'lucide-react'
import { useState } from 'react'

const WEBHOOK_EVENT_OPTIONS = [
  'order.created',
  'order.updated',
  'order.processing',
  'order.completed',
  'order.failed',
  'order.cancelled',
  'order.rejected',
  'order.refunded',
  'order.replied',
]

interface ApiKeyInfo {
  id: string
  name: string
  keyPrefix: string
  status: string
  permissions: string
  requestLimit: number
  totalRequests: number
  lastUsedAt: string | null
  createdAt: string
}

interface WebhookInfo {
  id: string
  url: string
  hasSecret: boolean
  subscribedEvents: string[]
  status: string
  updatedAt: string
  deliveryCount: number
}

interface LogInfo {
  id: string
  requestId: string
  endpoint: string
  method: string
  statusCode: number
  createdAt: string
}

interface ApiInfo {
  apiKeys: ApiKeyInfo[]
  webhook: WebhookInfo | null
  recentLogs: LogInfo[]
}

export default function ResellerApiSettingsPage() {
  const { data, loading, error, refetch } = useApi<ApiInfo>({ url: '/api/reseller/api-info' })
  const { toast } = useToast()

  const [revealed, setRevealed] = useState<{ keyId: string; key: string } | null>(null)
  const [revealing, setRevealing] = useState<string | null>(null)
  const [rotatingKey, setRotatingKey] = useState<ApiKeyInfo | null>(null)
  const [rotating, setRotating] = useState(false)
  const [newKey, setNewKey] = useState<{ name: string; key: string | null; keyPrefix: string } | null>(null)

  const [url, setUrl] = useState('')
  const [customSecret, setCustomSecret] = useState('')
  const [events, setEvents] = useState<string[]>(WEBHOOK_EVENT_OPTIONS)
  const [whStatus, setWhStatus] = useState('active')
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [testingWebhook, setTestingWebhook] = useState(false)
  const [newSecret, setNewSecret] = useState<string | null>(null)

  const webhook = data?.webhook ?? null

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast('success', `${label} copied`)
    } catch {
      toast('error', 'Could not copy — select and copy manually')
    }
  }

  async function reveal(keyId: string) {
    setRevealing(keyId)
    try {
      const res = await csrfFetch('/api/reseller/api-key/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to reveal key')
      setRevealed({ keyId, key: json.key })
      toast('success', 'Key revealed')
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'Failed to reveal key')
    } finally {
      setRevealing(null)
    }
  }

  function hide() {
    setRevealed(null)
  }

  async function rotate(): Promise<void> {
    if (!rotatingKey) return
    setRotating(true)
    try {
      const res = await csrfFetch('/api/reseller/api-key/rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId: rotatingKey.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to rotate key')
      setRotatingKey(null)
      setNewKey({ name: json.name || rotatingKey.name, key: json.key, keyPrefix: json.keyPrefix })
      setRevealed(null)
      toast('success', 'API key rotated — the old key is now invalid')
      refetch()
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'Failed to rotate key')
    } finally {
      setRotating(false)
    }
  }

  function toggleEvent(ev: string) {
    setEvents((prev) => (prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]))
  }

  async function saveWebhook(opts: { generateSecret?: boolean } = {}) {
    if (!url.trim()) {
      toast('error', 'Webhook URL is required')
      return
    }
    setSavingWebhook(true)
    try {
      const body: Record<string, unknown> = { url: url.trim(), events, status: whStatus }
      if (opts.generateSecret) {
        body.generate_secret = true
      } else if (customSecret.trim()) {
        body.secret = customSecret.trim()
      }
      const res = await csrfFetch('/api/reseller/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save webhook')
      setCustomSecret('')
      if (json.generatedSecret) {
        setNewSecret(json.generatedSecret)
      }
      toast('success', opts.generateSecret ? 'New webhook secret generated' : 'Webhook saved')
      refetch()
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'Failed to save webhook')
    } finally {
      setSavingWebhook(false)
    }
  }

  async function testPing() {
    setTestingWebhook(true)
    try {
      const res = await csrfFetch('/api/reseller/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Test ping failed')
      toast('success', json.ok ? 'Test ping delivered' : 'Test failed — check your endpoint')
      setNewSecret(null)
      refetch()
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'Test ping failed')
    } finally {
      setTestingWebhook(false)
    }
  }

  const permissionLabels: Record<string, string> = { read: 'Read', write: 'Read & Write', admin: 'Full Admin' }

  if (loading) {
    return (
      <div>
        <Header title="API Settings" subtitle="Loading..." />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Header title="API Settings" />
        <div className="p-6 flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="API Settings" subtitle="Your integration credentials & webhook status" />
      <div className="p-6 space-y-6">
        <GlassCard>
          <div className="flex items-start gap-3">
            <Info size={20} className="text-[var(--accent)] flex-shrink-0 mt-0.5" />
            <div className="text-sm text-[var(--muted)] leading-relaxed">
              API keys are issued by your platform admin, but you can <strong className="text-[var(--foreground)]">reveal</strong> or{' '}
              <strong className="text-[var(--foreground)]">rotate</strong> your own keys below. Configure your webhook endpoint to receive order status
              updates automatically.
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Key size={18} className="text-[var(--accent)]" />
            <h3 className="font-semibold text-[var(--foreground)]">API Keys</h3>
          </div>
          {(!data?.apiKeys || data.apiKeys.length === 0) ? (
            <p className="text-sm text-[var(--muted)] py-4">No API keys issued yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="w-full text-sm min-w-[820px]">
                <thead>
                  <tr className="border-b border-[var(--card-border)]">
                    <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Name</th>
                    <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Key</th>
                    <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Permissions</th>
                    <th className="text-right py-3 px-4 text-[var(--muted)] font-medium">Rate Limit</th>
                    <th className="text-right py-3 px-4 text-[var(--muted)] font-medium">Usage</th>
                    <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Last Used</th>
                    <th className="text-right py-3 px-4 text-[var(--muted)] font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.apiKeys.map((k) => {
                    const isRevealed = revealed?.keyId === k.id
                    return (
                      <tr key={k.id} className="border-b border-[var(--card-border)]">
                        <td className="py-3 px-4 font-medium text-[var(--foreground)]">{k.name}</td>
                        <td className="py-3 px-4">
                          {isRevealed ? (
                            <code className="text-xs text-[var(--accent)] bg-white/5 px-2 py-1 rounded break-all">{revealed!.key}</code>
                          ) : (
                            <code className="text-xs text-[var(--muted)] bg-white/5 px-2 py-1 rounded">{k.keyPrefix}</code>
                          )}
                        </td>
                        <td className="py-3 px-4"><StatusBadge status={k.status} /></td>
                        <td className="py-3 px-4"><span className="text-xs font-medium px-2 py-1 rounded-lg bg-white/5">{permissionLabels[k.permissions] || k.permissions}</span></td>
                        <td className="py-3 px-4 text-right text-[var(--foreground)]">{k.requestLimit}/min</td>
                        <td className="py-3 px-4 text-right text-[var(--foreground)]">{k.totalRequests.toLocaleString()}</td>
                        <td className="py-3 px-4 text-xs text-[var(--muted)]">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'Never'}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            {isRevealed ? (
                              <>
<GlassButton size="sm" variant="ghost" onClick={() => copy(revealed!.key, 'API key')}>
                              <Copy size={14} />
                            </GlassButton>
                            <GlassButton size="sm" variant="ghost" onClick={hide}>
                              <EyeOff size={14} />
                            </GlassButton>
                              </>
                            ) : (
                              <GlassButton
                                size="sm"
                                variant="ghost"
                                disabled={revealing === k.id}
                                onClick={() => reveal(k.id)}
                              >
                                {revealing === k.id ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                                Show
                              </GlassButton>
                            )}
                            <GlassButton
                              size="sm"
                              variant="ghost"
                              disabled={k.status !== 'active'}
                              onClick={() => setRotatingKey(k)}
                            >
                              <RefreshCw size={14} />
                              Rotate
                            </GlassButton>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <Webhook size={18} className="text-[var(--accent)]" />
              <h3 className="font-semibold text-[var(--foreground)]">Webhook</h3>
            </div>
            {webhook && <StatusBadge status={webhook.status} />}
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5 block">Endpoint URL</label>
              <div className="flex gap-2">
                <input
                  className="glass-input w-full"
                  placeholder="https://your-site.com/webhook"
                  value={url || webhook?.url || ''}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5 block flex items-center gap-1">
                  <ShieldAlert size={12} /> Signing Secret
                </label>
                <div className="flex flex-wrap gap-2">
                  <span className={`text-sm self-center ${webhook?.hasSecret ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {webhook?.hasSecret ? 'Configured' : 'Not set'}
                  </span>
                  <GlassButton size="sm" disabled={savingWebhook} onClick={() => saveWebhook({ generateSecret: true })}>
                    <RefreshCw size={14} /> Generate secret
                  </GlassButton>
                </div>
                <input
                  className="glass-input mt-2 w-full"
                  placeholder="…or paste your own secret (8+ chars)"
                  value={customSecret}
                  onChange={(e) => setCustomSecret(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5 block">Status</label>
                <select className="glass-input w-full" value={whStatus || webhook?.status || 'active'} onChange={(e) => setWhStatus(e.target.value)}>
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
                <p className="text-xs text-[var(--muted)] mt-2">Deliveries: {webhook?.deliveryCount ?? 0}</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5 block">Subscribed Events</label>
              <div className="flex flex-wrap gap-1.5">
                {WEBHOOK_EVENT_OPTIONS.map((ev) => (
                  <button
                    key={ev}
                    type="button"
                    onClick={() => toggleEvent(ev)}
                    className={`text-[11px] px-2 py-0.5 rounded-lg border transition-colors ${
                      events.includes(ev)
                        ? 'bg-[var(--accent)]/10 border-[var(--accent)]/40 text-[var(--foreground)]'
                        : 'bg-white/5 border-transparent text-[var(--muted)]'
                    }`}
                  >
                    {ev}
                  </button>
                ))}
              </div>
            </div>

            {newSecret && (
              <div className="glass-premium p-4 border border-emerald-500/20">
                <p className="text-sm font-semibold text-[var(--foreground)] mb-2 flex items-center gap-1.5">
                  <CheckCircle size={16} className="text-emerald-500" /> New signing secret — copy it now, it won&apos;t be shown again
                </p>
                <code className="text-sm text-[var(--accent)] bg-white/5 px-2 py-1 rounded break-all block mb-2">{newSecret}</code>
                <div className="flex gap-2">
                  <GlassButton size="sm" onClick={() => copy(newSecret, 'Webhook secret')}>
                    <Copy size={14} /> Copy secret
                  </GlassButton>
                  <GlassButton size="sm" variant="ghost" onClick={() => setNewSecret(null)}>
                    <X size={14} /> Dismiss
                  </GlassButton>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <GlassButton disabled={savingWebhook} onClick={() => saveWebhook()}>
                <PlusCircle size={16} /> {webhook ? 'Save webhook' : 'Create webhook'}
              </GlassButton>
              <GlassButton variant="ghost" disabled={testingWebhook || !webhook} onClick={testPing}>
                {testingWebhook ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send test ping
              </GlassButton>
              <span className="text-xs text-[var(--muted)] ml-auto">
                {webhook ? `Updated ${new Date(webhook.updatedAt).toLocaleString()}` : 'Not configured'}
              </span>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Loader2 size={18} className="text-[var(--accent)]" />
            <h3 className="font-semibold text-[var(--foreground)]">Recent API Activity</h3>
          </div>
          {(!data?.recentLogs || data.recentLogs.length === 0) ? (
            <p className="text-sm text-[var(--muted)] py-4">No API activity yet.</p>
          ) : (
            <div className="space-y-2">
              {data.recentLogs.map((l) => (
                <div key={l.id} className="flex items-center gap-3 text-sm rounded-xl px-3 py-2 bg-white/5">
                  <span className="text-xs font-mono text-[var(--muted)]">{l.method}</span>
                  <span className="text-xs font-mono text-[var(--foreground)] flex-1 truncate">{l.endpoint}</span>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-lg ${l.statusCode < 400 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{l.statusCode}</span>
                  <span className="text-xs text-[var(--muted)] whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

<ConfirmDialog
        open={!!rotatingKey}
        onClose={() => setRotatingKey(null)}
        onConfirm={rotate}
        title="Rotate API Key"
        message={`Rotating "${rotatingKey?.name}" immediately invalidates the current key. Orders already placed are unaffected; your webhook keeps working. This cannot be undone.`}
        variant="warning"
        confirmLabel={rotating ? 'Rotating…' : 'Rotate'}
        loading={rotating}
      />

      {newKey && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="glass-premium rounded-2xl p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center gap-2">
              <Key size={20} className="text-emerald-500" />
              <h3 className="text-lg font-bold text-[var(--foreground)]">New API key for “{newKey.name}”</h3>
            </div>
            <p className="text-sm text-[var(--muted)]">Copy it now — it won&apos;t be shown again.</p>
            <p className="text-xs text-[var(--muted)] mb-1">Your new API key:</p>
            <code className="text-sm text-[var(--accent)] bg-white/5 px-2 py-1 rounded break-all block">{newKey.key}</code>
            <div className="flex gap-2 justify-end">
              <GlassButton onClick={() => newKey.key && copy(newKey.key, 'API key')}>
                <Copy size={16} /> Copy
              </GlassButton>
              <GlassButton variant="ghost" onClick={() => setNewKey(null)}>Close</GlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}