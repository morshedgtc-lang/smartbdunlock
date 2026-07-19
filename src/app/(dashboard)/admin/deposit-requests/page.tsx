'use client'

/* eslint-disable @next/next/no-img-element -- base64 data URLs can't use next/image */
import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { useToast } from '@/components/ui/Toast'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle, XCircle, Eye } from 'lucide-react'
import { useState } from 'react'

interface DepositReq {
  id: string
  amount: number
  method: string
  transactionId?: string
  screenshot?: string
  status: string
  adminNote?: string
  userName?: string
  userEmail?: string
  userPublicId?: string
  approvedAt?: string
  createdAt: string
}

type TabType = 'pending' | 'approved' | 'rejected' | 'all'

export default function AdminDepositRequestsPage() {
  const { toast } = useToast()
  const [tab, setTab] = useState<TabType>('pending')
  const [page, setPage] = useState(1)
  const [actionId, setActionId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<'approved' | 'rejected'>('approved')
  const [adminNote, setAdminNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [viewReq, setViewReq] = useState<DepositReq | null>(null)

  const statusParam = tab === 'all' ? '' : tab
  const { data, loading, refetch } = useApi<{ requests: DepositReq[]; pagination: { total: number; pages: number } }>({ url: `/api/deposit-requests?status=${statusParam}&page=${page}&limit=10` })

  const requests = data?.requests || []

  const handleAction = async () => {
    if (!actionId) return
    setSaving(true)
    try {
      const res = await fetch('/api/deposit-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: actionId, status: actionType, adminNote: adminNote || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast('success', `Request ${actionType}`)
      setActionId(null)
      setAdminNote('')
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const tabs: { key: TabType; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'all', label: 'All' },
  ]

  return (
    <div>
      <Header title="Deposit Requests" subtitle="Review and approve deposit requests" />
      <div className="p-6 space-y-6">
        <div className="flex gap-2 flex-wrap">
          {tabs.map(t => (
            <GlassButton
              key={t.key}
              size="sm"
              variant={tab === t.key ? 'primary' : 'secondary'}
              onClick={() => { setTab(t.key); setPage(1) }}
            >
              {t.label}
            </GlassButton>
          ))}
        </div>

        <GlassCard padding="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Client</th>
                  <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">User ID</th>
                  <th className="text-right py-3 px-4 text-[var(--muted)] font-medium">Amount</th>
                  <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Method</th>
                  <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Transaction ID</th>
                  <th className="text-center py-3 px-4 text-[var(--muted)] font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Admin Note</th>
                  <th className="text-right py-3 px-4 text-[var(--muted)] font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="py-12 text-center"><Loader2 size={24} className="animate-spin mx-auto text-[var(--muted)]" /></td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan={8} className="py-12 text-center"><CheckCircle size={40} className="mx-auto text-[var(--muted)] mb-3 opacity-50" /><p className="text-[var(--muted)]">No requests</p></td></tr>
                ) : (
                  requests.map((r: DepositReq, i: number) => (
                    <motion.tr key={r.id} className="border-b border-[var(--card-border)] hover:bg-white/5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                       <td className="py-3 px-4">
                        <div className="text-[var(--foreground)]">{r.userName || 'Unknown'}</div>
                        <div className="text-xs text-[var(--muted)]">{r.userEmail}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-mono text-[var(--foreground)]">{r.userPublicId || '—'}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[var(--foreground)]">${r.amount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-[var(--foreground)] capitalize">{r.method}</td>
                      <td className="py-3 px-4 text-xs text-[var(--foreground)]">{r.transactionId || '—'}</td>
                      <td className="py-3 px-4 text-center"><StatusBadge status={r.status} /></td>
                      <td className="py-3 px-4 text-xs text-[var(--foreground)]">{r.adminNote || '—'}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex gap-1 justify-end">
                          {r.screenshot && (
                            <GlassButton size="sm" variant="ghost" onClick={() => setViewReq(r)}>
                              <Eye size={14} />
                            </GlassButton>
                          )}
                          {r.status === 'pending' && (
                            <>
                              <GlassButton size="sm" onClick={() => { setActionId(r.id); setActionType('approved'); setAdminNote('') }}>
                                <CheckCircle size={14} />
                              </GlassButton>
                              <GlassButton size="sm" variant="danger" onClick={() => { setActionId(r.id); setActionType('rejected'); setAdminNote('') }}>
                                <XCircle size={14} />
                              </GlassButton>
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
          {data?.pagination && data.pagination.pages > 1 && (
            <div className="flex justify-center gap-2 p-4">
              <GlassButton size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</GlassButton>
              <span className="text-sm text-[var(--muted)] py-1">Page {page} of {data.pagination.pages}</span>
              <GlassButton size="sm" variant="secondary" disabled={page >= data.pagination.pages} onClick={() => setPage(p => p + 1)}>Next</GlassButton>
            </div>
          )}
        </GlassCard>

        {actionId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div className="glass p-6 w-full max-w-md mx-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <h3 className="text-lg font-bold text-[var(--foreground)] mb-4">
                {actionType === 'approved' ? 'Approve' : 'Reject'} Request
              </h3>
              <div className="mb-4">
                <label className="block text-xs text-[var(--muted)] mb-1">Admin Note (optional)</label>
                <textarea className="glass-input w-full" rows={3} placeholder="Add a note..." value={adminNote} onChange={e => setAdminNote(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <GlassButton variant="secondary" className="flex-1" onClick={() => { setActionId(null); setAdminNote('') }}>Cancel</GlassButton>
                <GlassButton variant={actionType === 'rejected' ? 'danger' : 'primary'} className="flex-1" onClick={handleAction} disabled={saving}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : actionType === 'approved' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  Confirm
                </GlassButton>
              </div>
            </motion.div>
          </div>
        )}

        {viewReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setViewReq(null)}>
            <motion.div className="glass p-6 w-full max-w-lg mx-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--foreground)]">Payment Screenshot</h3>
                <button onClick={() => setViewReq(null)} className="text-[var(--muted)] hover:text-[var(--foreground)]"><XCircle size={20} /></button>
              </div>
              <div className="text-sm text-[var(--muted)] mb-3">
                {viewReq.userName} — ${viewReq.amount.toFixed(2)} via {viewReq.method}
              </div>
              {viewReq.screenshot ? (
                <img src={viewReq.screenshot} alt="Screenshot" className="w-full rounded-lg" />
              ) : (
                <p className="text-[var(--muted)]">No screenshot provided</p>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
