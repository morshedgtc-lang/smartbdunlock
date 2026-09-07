'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { Loader2, Key, Webhook, ShieldAlert, Info } from 'lucide-react'
import { useState } from 'react'

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
  const { data, loading, error } = useApi<ApiInfo>({ url: '/api/reseller/api-info' })
  const [showKey, setShowKey] = useState<string | null>(null)

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
              API keys and webhook endpoints are issued and managed by the platform admin for security reasons.
              <button className="ml-1 text-[var(--accent)] hover:underline cursor-pointer" onClick={() => setShowKey('contact')}>Contact support</button> to
              request a key or configure your webhook endpoint. Once configured, the webhook status and delivery activity appear here.
            </div>
          </div>
        </GlassCard>

        {showKey === 'contact' && (
          <div className="glass-premium p-4 border border-emerald-500/20 text-sm text-[var(--muted)]">
            Reach the admin via the dashboard support section (tickets), or email us with your account name and the endpoint you want to enable.
          </div>
        )}

        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Key size={18} className="text-[var(--accent)]" />
            <h3 className="font-semibold text-[var(--foreground)]">API Keys</h3>
          </div>
          {(!data?.apiKeys || data.apiKeys.length === 0) ? (
            <p className="text-sm text-[var(--muted)] py-4">No API keys issued yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-[var(--card-border)]">
                    <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Name</th>
                    <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Key</th>
                    <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Permissions</th>
                    <th className="text-right py-3 px-4 text-[var(--muted)] font-medium">Rate Limit</th>
                    <th className="text-right py-3 px-4 text-[var(--muted)] font-medium">Usage</th>
                    <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Last Used</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.apiKeys.map((k) => (
                    <tr key={k.id} className="border-b border-[var(--card-border)]">
                      <td className="py-3 px-4 font-medium text-[var(--foreground)]">{k.name}</td>
                      <td className="py-3 px-4">
                        <code className="text-xs text-[var(--muted)] bg-white/5 px-2 py-1 rounded">{k.keyPrefix}••••••••</code>
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={k.status} /></td>
                      <td className="py-3 px-4"><span className="text-xs font-medium px-2 py-1 rounded-lg bg-white/5">{permissionLabels[k.permissions] || k.permissions}</span></td>
                      <td className="py-3 px-4 text-right text-[var(--foreground)]">{k.requestLimit}/min</td>
                      <td className="py-3 px-4 text-right text-[var(--foreground)]">{k.totalRequests.toLocaleString()}</td>
                      <td className="py-3 px-4 text-xs text-[var(--muted)]">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'Never'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Webhook size={18} className="text-[var(--accent)]" />
            <h3 className="font-semibold text-[var(--foreground)]">Webhook</h3>
            {data?.webhook && <StatusBadge status={data.webhook.status} />}
          </div>
          {!data?.webhook ? (
            <p className="text-sm text-[var(--muted)] py-4">No webhook configured for your account.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Endpoint URL</p>
                <code className="text-sm text-[var(--foreground)] bg-white/5 px-2 py-1 rounded break-all">{data.webhook.url}</code>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <ShieldAlert size={12} /> Signing Secret
                  </p>
                  <span className={`text-sm ${data.webhook.hasSecret ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {data.webhook.hasSecret ? 'Configured' : 'Not set'}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Deliveries</p>
                  <span className="text-sm text-[var(--foreground)]">{data.webhook.deliveryCount}</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Subscribed Events ({data.webhook.subscribedEvents.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.webhook.subscribedEvents.map((ev) => (
                    <span key={ev} className="text-[11px] px-2 py-0.5 rounded-lg bg-white/5 text-[var(--muted)]"><code>{ev}</code></span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-[var(--muted)]">
                Updated {new Date(data.webhook.updatedAt).toLocaleString()}
              </p>
            </div>
          )}
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
    </div>
  )
}