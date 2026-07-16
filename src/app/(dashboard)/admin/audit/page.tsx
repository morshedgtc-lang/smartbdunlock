'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassDropdown, DropdownOption } from '@/components/ui/GlassDropdown'
import { Search, Download, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'

interface AuditLogEntry {
  id: string
  userId: string | null
  userEmail: string | null
  action: string
  entityType: string
  entityId: string | null
  description: string | null
  module: string | null
  oldValues: string | null
  newValues: string | null
  ip: string | null
  createdAt: string
}

const actionColors: Record<string, string> = {
  'login.success': 'text-green-400', 'login.failed': 'text-red-400', 'login.rate_limited': 'text-orange-400',
  'user.create': 'text-blue-400', 'user.update': 'text-yellow-400', 'user.delete': 'text-red-400',
  'order.create': 'text-green-400', 'order.update': 'text-yellow-400', 'order.status_change': 'text-blue-400',
  'wallet.deposit': 'text-green-400', 'wallet.withdraw': 'text-orange-400', 'wallet.transfer': 'text-blue-400',
  'service.create': 'text-green-400', 'service.update': 'text-yellow-400', 'service.delete': 'text-red-400',
  'supplier.create': 'text-green-400', 'supplier.update': 'text-yellow-400', 'supplier.delete': 'text-red-400',
  'category.create': 'text-green-400', 'category.update': 'text-yellow-400', 'category.delete': 'text-red-400',
}

const MODULE_OPTIONS: DropdownOption[] = [
  { value: '', label: 'All Modules' },
  { value: 'auth', label: 'Authentication' },
  { value: 'users', label: 'Users' },
  { value: 'services', label: 'Services' },
  { value: 'orders', label: 'Orders' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'security', label: 'Security' },
]

const ENTITY_OPTIONS: DropdownOption[] = [
  { value: '', label: 'All Entities' },
  { value: 'user', label: 'User' },
  { value: 'order', label: 'Order' },
  { value: 'transaction', label: 'Transaction' },
  { value: 'service', label: 'Service' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'category', label: 'Category' },
]

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const pageSize = 50

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (moduleFilter) params.set('module', moduleFilter)
      if (entityFilter) params.set('entityType', entityFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      params.set('limit', String(pageSize))
      params.set('offset', String(page * pageSize))

      const res = await fetch(`/api/audit-logs?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setLogs(data.logs)
      setTotal(data.total)
    } catch (e) {
      console.error('Failed to load audit logs:', e)
    } finally {
      setLoading(false)
    }
  }, [search, moduleFilter, entityFilter, dateFrom, dateTo, page])

  useEffect(() => { fetchLogs() }, [search, moduleFilter, entityFilter, dateFrom, dateTo, page, fetchLogs])

  const handleExport = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (moduleFilter) params.set('module', moduleFilter)
    if (entityFilter) params.set('entityType', entityFilter)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    params.set('export', 'csv')
    params.set('limit', '500')
    window.open(`/api/audit-logs?${params}`, '_blank')
  }

  const formatDate = (d: string) => new Date(d).toLocaleString()
  const formatJson = (s: string | null) => {
    if (!s) return null
    try { return JSON.stringify(JSON.parse(s), null, 2) } catch { return s }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      <Header title="Audit Logs" subtitle={`Track all system activity (${total} entries)`} />
      <div className="p-6 space-y-6">
        {/* Filters */}
        <GlassCard padding="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                className="glass-input pl-9 w-full"
                placeholder="Search by email, action, or description..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0) }}
              />
            </div>
            <div className="w-44">
              <GlassDropdown options={MODULE_OPTIONS} value={moduleFilter} onChange={v => { setModuleFilter(v); setPage(0) }} size="sm" />
            </div>
            <div className="w-44">
              <GlassDropdown options={ENTITY_OPTIONS} value={entityFilter} onChange={v => { setEntityFilter(v); setPage(0) }} size="sm" />
            </div>
            <input className="glass-input w-auto" type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0) }} />
            <input className="glass-input w-auto" type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0) }} />
            <GlassButton size="sm" variant="secondary" onClick={handleExport}>
              <Download size={14} /> Export CSV
            </GlassButton>
            <GlassButton size="sm" onClick={fetchLogs}>
              <RefreshCw size={14} />
            </GlassButton>
          </div>
        </GlassCard>

        {/* Table */}
        <GlassCard padding="p-0">
          {loading ? (
            <div className="py-12 text-center text-[var(--muted)]">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-[var(--muted)]">No audit logs found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--card-border)]">
                    <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Time</th>
                    <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">User</th>
                    <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Action</th>
                    <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Module</th>
                    <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Entity</th>
                    <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">IP</th>
                    <th className="text-left py-3 px-4 text-[var(--muted)] font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-[var(--card-border)] hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-4 text-[var(--muted)] whitespace-nowrap text-xs">{formatDate(log.createdAt)}</td>
                      <td className="py-3 px-4 text-[var(--foreground)] text-xs">{log.userEmail || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium ${actionColors[log.action] || 'text-[var(--foreground)]'}`}>{log.action}</span>
                        {log.description && <p className="text-xs text-[var(--muted)] mt-0.5 max-w-[200px] truncate">{log.description}</p>}
                      </td>
                      <td className="py-3 px-4">
                        {log.module && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[var(--muted)] capitalize">{log.module}</span>}
                      </td>
                      <td className="py-3 px-4 text-[var(--muted)] text-xs">
                        {log.entityType}
                        {log.entityId && <span className="text-[var(--muted)] ml-1 opacity-50">({log.entityId.slice(0, 6)})</span>}
                      </td>
                      <td className="py-3 px-4 text-[var(--muted)] text-xs">{log.ip || '—'}</td>
                      <td className="py-3 px-4">
                        {(log.oldValues || log.newValues) && (
                          <button onClick={() => setExpandedId(expandedId === log.id ? null : log.id)} className="text-[var(--accent)] hover:underline text-xs">
                            {expandedId === log.id ? 'Hide' : 'Details'}
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>

              {/* Expanded Details */}
              <AnimatePresence>
                {expandedId && logs.filter(l => l.id === expandedId).map(log => (
                  <motion.div
                    key={`detail-${log.id}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-[var(--card-border)] p-4 bg-white/5"
                  >
                    {log.oldValues && (
                      <div className="mb-2">
                        <span className="text-xs text-[var(--muted)]">Old Values:</span>
                        <pre className="text-red-400/80 text-xs mt-1 overflow-x-auto">{formatJson(log.oldValues)}</pre>
                      </div>
                    )}
                    {log.newValues && (
                      <div>
                        <span className="text-xs text-[var(--muted)]">New Values:</span>
                        <pre className="text-green-400/80 text-xs mt-1 overflow-x-auto">{formatJson(log.newValues)}</pre>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--card-border)]">
              <p className="text-xs text-[var(--muted)]">Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}</p>
              <div className="flex items-center gap-2">
                <GlassButton size="sm" variant="secondary" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                  <ChevronLeft size={14} />
                </GlassButton>
                <span className="text-xs text-[var(--muted)]">Page {page + 1} of {totalPages}</span>
                <GlassButton size="sm" variant="secondary" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                  <ChevronRight size={14} />
                </GlassButton>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
