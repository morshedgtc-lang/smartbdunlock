'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassDropdown } from '@/components/ui/GlassDropdown'
import { StatCard } from '@/components/ui/StatCard'
import { useApi } from '@/hooks/useApi'
import { useToast } from '@/components/ui/Toast'
import { motion } from 'framer-motion'
import {
  RefreshCw, Loader2, CheckCircle2, AlertTriangle, XCircle,
  Clock, ArrowUpDown, ChevronDown, ChevronUp, AlertCircle,
} from 'lucide-react'
import { useState } from 'react'

interface SyncHistory {
  id: string
  providerId: string
  provider: { id: string; name: string }
  totalImported: number
  newServices: number
  updatedServices: number
  failedServices: number
  status: 'success' | 'partial' | 'failed'
  error: string | null
  duration: number
  createdAt: string
}

interface SyncHistoryResponse {
  histories: SyncHistory[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface SupplierItem {
  id: string
  name: string
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'success', label: 'Success' },
  { value: 'partial', label: 'Partial' },
  { value: 'failed', label: 'Failed' },
]

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec} sec ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hr ago`
  const day = Math.floor(hr / 24)
  return `${day} day${day > 1 ? 's' : ''} ago`
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

const statusColorMap: Record<string, string> = {
  success: 'badge-success',
  partial: 'badge-warning',
  failed: 'badge-danger',
}

export default function SyncHistoryPage() {
  const [providerFilter, setProviderFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [expandedError, setExpandedError] = useState<string | null>(null)
  const { toast } = useToast()

  const { data, loading, error, refetch } = useApi<SyncHistoryResponse>({
    url: `/api/sync-history?${providerFilter ? `providerId=${providerFilter}&` : ''}${statusFilter ? `status=${statusFilter}&` : ''}page=${page}&limit=20`,
  })

  const { data: suppliersData } = useApi<{ suppliers: SupplierItem[] }>({ url: '/api/suppliers' })
  const suppliers = suppliersData?.suppliers || []

  const histories = data?.histories || []
  const totalPages = data?.totalPages || 1
  const total = data?.total || 0

  const totalSuccess = histories.filter((h) => h.status === 'success').length
  const totalPartial = histories.filter((h) => h.status === 'partial').length
  const totalFailed = histories.filter((h) => h.status === 'failed').length

  const handleRefresh = () => {
    refetch()
    toast('info', 'Refreshing sync history...')
  }

  if (loading && !data) {
    return (
      <div>
        <Header title="Sync History" subtitle="Loading..." />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Header title="Sync History" />
        <div className="p-6 flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-red-400 text-sm">{error}</p>
          <GlassButton size="sm" variant="secondary" onClick={handleRefresh}>
            <RefreshCw size={16} /> Retry
          </GlassButton>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Sync History" subtitle="View API sync logs and status" />
      <div className="p-6 space-y-6">
        {/* Filters */}
        <motion.div className="glass p-4" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <GlassDropdown
              options={[{ value: '', label: 'All Providers' }, ...suppliers.map((s: SupplierItem) => ({ value: s.id, label: s.name }))]}
              value={providerFilter}
              onChange={(v) => { setProviderFilter(v); setPage(1) }}
              className="w-full md:w-48"
              size="sm"
            />
            <GlassDropdown
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setPage(1) }}
              className="w-full md:w-44"
              size="sm"
            />
            <div className="flex-1" />
            <GlassButton size="sm" variant="secondary" onClick={handleRefresh}>
              <RefreshCw size={16} /> Refresh
            </GlassButton>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Syncs" value={total} icon={ArrowUpDown} color="blue" />
          <StatCard title="Successful" value={totalSuccess} icon={CheckCircle2} color="green" />
          <StatCard title="Partial" value={totalPartial} icon={AlertTriangle} color="amber" />
          <StatCard title="Failed" value={totalFailed} icon={XCircle} color="red" />
        </div>

        {/* Table */}
        <GlassCard padding="p-0">
          <div className="table-responsive">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Time</th>
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Provider</th>
                  <th className="text-right py-4 px-4 text-[var(--muted)] font-medium">Imported</th>
                  <th className="text-right py-4 px-4 text-[var(--muted)] font-medium">New</th>
                  <th className="text-right py-4 px-4 text-[var(--muted)] font-medium">Updated</th>
                  <th className="text-right py-4 px-4 text-[var(--muted)] font-medium">Failed</th>
                  <th className="text-center py-4 px-4 text-[var(--muted)] font-medium">Status</th>
                  <th className="text-right py-4 px-4 text-[var(--muted)] font-medium">Duration</th>
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {histories.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <Clock size={40} className="mx-auto text-[var(--muted)] mb-3 opacity-50" />
                      <p className="text-[var(--muted)]">No sync history found</p>
                      <p className="text-xs text-[var(--muted)] mt-1">Sync operations will appear here once they run</p>
                    </td>
                  </tr>
                ) : (
                  histories.map((history: SyncHistory, i: number) => {
                    const isExpanded = expandedError === history.id
                    const hasError = history.error && history.status === 'failed'
                    return (
                      <motion.tr
                        key={history.id}
                        className="border-b border-[var(--card-border)] hover:bg-white/5 transition-colors"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                      >
                        <td className="py-3 px-4">
                          <div>
                            <span className="text-xs text-[var(--foreground)]">{timeAgo(history.createdAt)}</span>
                            <p className="text-[10px] text-[var(--muted)] mt-0.5">{new Date(history.createdAt).toLocaleString()}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm font-medium text-[var(--foreground)]">{history.provider?.name || 'Unknown'}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-sm text-[var(--foreground)] font-medium">{history.totalImported}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-sm text-emerald-500 font-medium">+{history.newServices}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-sm text-blue-400 font-medium">{history.updatedServices}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`text-sm font-medium ${history.failedServices > 0 ? 'text-red-500' : 'text-[var(--muted)]'}`}>
                            {history.failedServices}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`badge ${statusColorMap[history.status] || 'badge-neutral'}`}>
                            {history.status.charAt(0).toUpperCase() + history.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-xs text-[var(--muted)] font-mono">{formatDuration(history.duration)}</span>
                        </td>
                        <td className="py-3 px-4 max-w-[200px]">
                          {hasError ? (
                            <button
                              onClick={() => setExpandedError(isExpanded ? null : history.id)}
                              className="flex items-start gap-1.5 text-left group"
                            >
                              <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                              <span className={`text-xs text-red-400 ${isExpanded ? '' : 'line-clamp-2'}`}>
                                {history.error}
                              </span>
                              {isExpanded ? (
                                <ChevronUp size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
                              ) : (
                                <ChevronDown size={12} className="text-red-400 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </button>
                          ) : (
                            <span className="text-xs text-[var(--muted)]">—</span>
                          )}
                        </td>
                      </motion.tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--card-border)]">
              <span className="text-xs text-[var(--muted)]">Page {page} of {totalPages} ({total} syncs)</span>
              <div className="flex gap-2">
                <GlassButton size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Prev
                </GlassButton>
                <GlassButton size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Next
                </GlassButton>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
