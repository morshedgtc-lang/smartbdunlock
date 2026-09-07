'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { Loader2, Activity, RefreshCw } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { motion } from 'framer-motion'
import { useState, useEffect, useCallback } from 'react'

interface LogRow {
  id: string
  requestId: string
  key: { id: string; name: string; keyPrefix: string } | null
  user: { id: string; name: string; email: string; role: string } | null
  endpoint: string
  method: string
  statusCode: number
  durationMs: number
  errorCode: string | null
  externalId: string | null
  ip: string | null
  createdAt: string
}

export default function ApiLogsPage() {
  const { toast } = useToast()
  const [logs, setLogs] = useState<LogRow[]>([])
  const [meta, setMeta] = useState<{ total: number; errors: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshTick, setRefreshTick] = useState(0)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [selected, setSelected] = useState<LogRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/api-logs?limit=200')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLogs(data.logs || [])
      setMeta(data.meta || null)
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed to load logs')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load, refreshTick])

  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(() => { load() }, 15_000)
    return () => clearInterval(t)
  }, [autoRefresh, load])

  const statusColor = (code: number) => {
    if (code < 300) return 'bg-emerald-500/10 text-emerald-500'
    if (code < 400) return 'bg-amber-500/10 text-amber-500'
    return 'bg-red-500/10 text-red-500'
  }

  return (
    <div>
      <Header title="API Logs" subtitle={meta ? `${meta.total} requests · ${meta.errors} errors` : 'Reseller API activity'} />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-[var(--muted)] cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="accent-[var(--accent)]" />
            Auto-refresh every 15s
          </label>
          <button
            className="px-3 py-1.5 rounded-xl glass-btn glass-btn-secondary text-xs flex items-center gap-2 cursor-pointer"
            onClick={() => setRefreshTick(t => t + 1)}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <GlassCard padding="p-0">
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Activity size={40} className="mx-auto text-[var(--muted)] mb-3 opacity-50" />
              <p className="text-[var(--muted)]">No API requests logged yet</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="border-b border-[var(--card-border)]">
                    <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Time</th>
                    <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Method</th>
                    <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Endpoint</th>
                    <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Key</th>
                    <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Reseller</th>
                    <th className="text-right py-4 px-4 text-[var(--muted)] font-medium">Status</th>
                    <th className="text-right py-4 px-4 text-[var(--muted)] font-medium">Duration</th>
                    <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">External ID</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l, i) => (
                    <motion.tr
                      key={l.id}
                      className="border-b border-[var(--card-border)] hover:bg-white/5 transition-colors cursor-pointer"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.5) }}
                      onClick={() => setSelected(l)}
                    >
                      <td className="py-3 px-4 text-xs text-[var(--muted)] whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-mono px-2 py-1 rounded-lg bg-white/5">{l.method}</span>
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-xs text-[var(--foreground)]">{l.endpoint}</code>
                      </td>
                      <td className="py-3 px-4 text-xs text-[var(--muted)]">
                        {l.key ? <span className="font-medium text-[var(--foreground)]">{l.key.name}</span> : <span className="opacity-60">—</span>}
                      </td>
                      <td className="py-3 px-4 text-xs text-[var(--muted)]">
                        {l.user ? `${l.user.name}${l.user.role === 'admin' ? ' (admin)' : ''}` : <span className="opacity-60">—</span>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-block text-xs font-mono px-2 py-1 rounded-lg ${statusColor(l.statusCode)}`}>
                          {l.statusCode}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-[var(--muted)]">{l.durationMs}ms</td>
                      <td className="py-3 px-4 text-xs text-[var(--muted)]">{l.externalId || '—'}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>

        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelected(null)}>
            <motion.div className="glass p-6 w-full max-w-lg mx-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-[var(--foreground)] mb-4">Request Details</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-[var(--muted)] flex-shrink-0">Request ID</dt><dd className="font-mono text-xs text-[var(--foreground)] break-all">{selected.requestId}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-[var(--muted)] flex-shrink-0">Endpoint</dt><dd className="text-[var(--foreground)] break-all">{selected.method} {selected.endpoint}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-[var(--muted)] flex-shrink-0">Status</dt><dd><span className={`text-xs font-mono px-2 py-0.5 rounded-lg ${statusColor(selected.statusCode)}`}>{selected.statusCode}</span>{selected.errorCode ? <span className="text-xs text-red-400 ml-2">{selected.errorCode}</span> : null}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-[var(--muted)] flex-shrink-0">Duration</dt><dd className="text-[var(--foreground)]">{selected.durationMs}ms</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-[var(--muted)] flex-shrink-0">Key</dt><dd className="text-[var(--foreground)]">{selected.key ? `${selected.key.name} (${selected.key.keyPrefix}…)` : '—'}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-[var(--muted)] flex-shrink-0">Reseller</dt><dd className="text-[var(--foreground)]">{selected.user ? `${selected.user.name} · ${selected.user.email}` : '—'}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-[var(--muted)] flex-shrink-0">External ID</dt><dd className="text-[var(--foreground)]">{selected.externalId || '—'}</dd></div>
                {selected.ip && <div className="flex justify-between gap-4"><dt className="text-[var(--muted)] flex-shrink-0">IP</dt><dd className="text-[var(--foreground)]">{selected.ip}</dd></div>}
                <div className="flex justify-between gap-4"><dt className="text-[var(--muted)] flex-shrink-0">Time</dt><dd className="text-[var(--foreground)]">{new Date(selected.createdAt).toLocaleString()}</dd></div>
              </dl>
              <div className="flex justify-end pt-4">
                <button className="px-4 py-2 rounded-xl glass-btn glass-btn-secondary text-sm cursor-pointer" onClick={() => setSelected(null)}>Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}