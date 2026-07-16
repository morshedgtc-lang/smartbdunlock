'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { useApi } from '@/hooks/useApi'
import { motion } from 'framer-motion'
import { Search, Trash2, Loader2, FileText, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useState } from 'react'

interface LogEntry {
  id: string
  level: string
  message: string
  source: string
  createdAt: string
}

const levelConfig: Record<string, { color: string; icon: typeof Info }> = {
  info: { color: 'text-blue-500', icon: Info },
  warn: { color: 'text-amber-500', icon: AlertTriangle },
  error: { color: 'text-red-500', icon: AlertCircle },
  debug: { color: 'text-gray-500', icon: FileText },
}

export default function LogsPage() {
  const [levelFilter, setLevelFilter] = useState('ALL')
  const [sourceFilter, setSourceFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newLog, setNewLog] = useState({ level: 'info', message: '', source: '' })
  const [saving, setSaving] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const { toast } = useToast()
  const { data, loading, error, refetch } = useApi<{ logs: LogEntry[] }>({
    url: `/api/logs?limit=200${levelFilter !== 'ALL' ? `&level=${levelFilter}` : ''}${sourceFilter ? `&source=${sourceFilter}` : ''}`,
  })
  const logs = data?.logs || []

  const handleClearAll = async () => {
    setConfirmClear(true)
  }

  const confirmClearLogs = async () => {
    setConfirmClear(false)
    try {
      const res = await fetch('/api/logs', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast('success', 'Logs cleared')
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
    }
  }

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLog),
      })
      if (!res.ok) throw new Error('Failed')
      toast('success', 'Log added')
      setShowAddModal(false)
      setNewLog({ level: 'info', message: '', source: '' })
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <Header title="System Logs" subtitle="Loading..." />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Header title="System Logs" />
        <div className="p-6 flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={confirmClearLogs}
        title="Clear All Logs"
        message="Clear all system logs? This action cannot be undone."
        variant="danger"
        confirmLabel="Clear All"
      />
      <Header title="System Logs" subtitle={`${logs.length} entries`} />
      <div className="p-6 space-y-6">
        <motion.div className="glass p-4" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <div className="relative flex-1 w-full md:max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                className="glass-input-search"
                placeholder="Filter by source..."
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['ALL', 'info', 'warn', 'error', 'debug'].map((l) => (
                <button
                  key={l}
                  className={`filter-pill ${levelFilter === l ? 'active' : ''}`}
                  onClick={() => setLevelFilter(l)}
                >
                  {l === 'ALL' ? 'All Levels' : l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="flex gap-3 justify-end">
          <GlassButton size="sm" variant="secondary" onClick={() => setShowAddModal(true)}>
            Add Log Entry
          </GlassButton>
          <GlassButton size="sm" variant="danger" onClick={handleClearAll}>
            <Trash2 size={16} /> Clear All
          </GlassButton>
        </div>

        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div className="glass p-6 w-full max-w-md mx-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <h3 className="text-lg font-bold text-[var(--foreground)] mb-4">Add Log Entry</h3>
              <form onSubmit={handleAddLog} className="space-y-3">
                <select className="glass-input w-full" value={newLog.level} onChange={(e) => setNewLog({ ...newLog, level: e.target.value })}>
                  <option value="info">Info</option>
                  <option value="warn">Warning</option>
                  <option value="error">Error</option>
                  <option value="debug">Debug</option>
                </select>
                <input className="glass-input w-full" placeholder="Source (e.g., auth, order)" value={newLog.source} onChange={(e) => setNewLog({ ...newLog, source: e.target.value })} />
                <textarea className="glass-input w-full" placeholder="Message" value={newLog.message} onChange={(e) => setNewLog({ ...newLog, message: e.target.value })} required rows={3} />
                <div className="flex gap-3 pt-2">
                  <GlassButton type="button" variant="secondary" className="flex-1" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </GlassButton>
                  <GlassButton type="submit" className="flex-1" disabled={saving}>
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                    Add
                  </GlassButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        <GlassCard padding="p-0">
          <div className="table-responsive">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Level</th>
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Message</th>
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Source</th>
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center">
                      <FileText size={40} className="mx-auto text-[var(--muted)] mb-3 opacity-50" />
                      <p className="text-[var(--muted)]">No logs found</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log: LogEntry, i: number) => {
                    const config = levelConfig[log.level] || levelConfig.info
                    const Icon = config.icon
                    return (
                      <motion.tr
                        key={log.id}
                        className="border-b border-[var(--card-border)] hover:bg-white/5 transition-colors"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                      >
                        <td className="py-3 px-4">
                          <span className={`flex items-center gap-2 text-xs font-medium ${config.color}`}>
                            <Icon size={14} />
                            {log.level.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[var(--foreground)] max-w-md truncate">{log.message}</td>
                        <td className="py-3 px-4 text-[var(--muted)] text-xs">{log.source || '-'}</td>
                        <td className="py-3 px-4 text-[var(--muted)] text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                      </motion.tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
