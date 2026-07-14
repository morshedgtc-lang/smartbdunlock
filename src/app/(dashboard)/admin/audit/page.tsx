'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassInput } from '@/components/ui/GlassInput'

interface AuditLogEntry {
  id: string
  userId: string | null
  userEmail: string | null
  action: string
  entityType: string
  entityId: string | null
  oldValues: string | null
  newValues: string | null
  ip: string | null
  createdAt: string
}

const actionColors: Record<string, string> = {
  'login.success': 'text-green-400',
  'login.failed': 'text-red-400',
  'login.rate_limited': 'text-orange-400',
  'user.create': 'text-blue-400',
  'user.update': 'text-yellow-400',
  'user.delete': 'text-red-400',
  'order.create': 'text-green-400',
  'order.update': 'text-yellow-400',
  'wallet.deposit': 'text-green-400',
  'wallet.withdraw': 'text-orange-400',
  'wallet.transfer': 'text-blue-400',
  'service.create': 'text-green-400',
  'service.update': 'text-yellow-400',
  'service.delete': 'text-red-400',
  'supplier.create': 'text-green-400',
  'supplier.update': 'text-yellow-400',
  'supplier.delete': 'text-red-400',
  'category.create': 'text-green-400',
  'category.update': 'text-yellow-400',
  'category.delete': 'text-red-400',
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (actionFilter) params.set('action', actionFilter)
      if (entityFilter) params.set('entityType', entityFilter)
      params.set('limit', '200')

      const res = await fetch(`/api/audit-logs?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setLogs(data.logs)
    } catch (e) {
      console.error('Failed to load audit logs:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs() }, [actionFilter, entityFilter])

  const formatDate = (d: string) => new Date(d).toLocaleString()
  const formatJson = (s: string | null) => {
    if (!s) return null
    try { return JSON.stringify(JSON.parse(s), null, 2) } catch { return s }
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white mb-2">Audit Logs</h1>
        <p className="text-white/60">Track all user actions across the system</p>
      </motion.div>

      <GlassCard>
        <div className="flex flex-wrap gap-4 items-center">
          <GlassInput
            placeholder="Filter by action (e.g. user.create)"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          />
          <GlassInput
            placeholder="Filter by entity (e.g. user)"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          />
          <GlassButton onClick={fetchLogs}>Refresh</GlassButton>
        </div>
      </GlassCard>

      <GlassCard>
        {loading ? (
          <div className="text-center py-8 text-white/60">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-white/60">No audit logs found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/60 border-b border-white/10">
                  <th className="text-left py-3 px-4">Time</th>
                  <th className="text-left py-3 px-4">User</th>
                  <th className="text-left py-3 px-4">Action</th>
                  <th className="text-left py-3 px-4">Entity</th>
                  <th className="text-left py-3 px-4">IP</th>
                  <th className="text-left py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="py-3 px-4 text-white/80 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="py-3 px-4 text-white/80">{log.userEmail || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={actionColors[log.action] || 'text-white/80'}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white/80">
                      {log.entityType}
                      {log.entityId && <span className="text-white/40 ml-1">({log.entityId.slice(0, 8)}...)</span>}
                    </td>
                    <td className="py-3 px-4 text-white/60">{log.ip || '—'}</td>
                    <td className="py-3 px-4">
                      {(log.oldValues || log.newValues) && (
                        <button
                          onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                          className="text-blue-400 hover:text-blue-300 text-xs"
                        >
                          {expandedId === log.id ? 'Hide' : 'Details'}
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>

            <AnimatePresence>
              {expandedId && logs.filter(l => l.id === expandedId).map(log => (
                <motion.div
                  key={`detail-${log.id}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-white/10 p-4 bg-white/5"
                >
                  {log.oldValues && (
                    <div className="mb-2">
                      <span className="text-white/60 text-xs">Old Values:</span>
                      <pre className="text-red-400/80 text-xs mt-1 overflow-x-auto">{formatJson(log.oldValues)}</pre>
                    </div>
                  )}
                  {log.newValues && (
                    <div>
                      <span className="text-white/60 text-xs">New Values:</span>
                      <pre className="text-green-400/80 text-xs mt-1 overflow-x-auto">{formatJson(log.newValues)}</pre>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </GlassCard>

    </div>
  )
}
