'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassDropdown } from '@/components/ui/GlassDropdown'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/lib/api'
import { motion } from 'framer-motion'
import { Loader2, Plus, X, CreditCard } from 'lucide-react'
import { useState } from 'react'

interface DepositReq {
  id: string
  amount: number
  method: string
  transactionId?: string
  status: string
  adminNote?: string
  approvedAt?: string
  createdAt: string
}

const METHODS = [
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'usdt', label: 'USDT' },
  { value: 'bank', label: 'Bank Transfer' },
]

export default function DepositRequestPage() {
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('bkash')
  const [transactionId, setTransactionId] = useState('')
  const [screenshot, setScreenshot] = useState('')
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)

  const { data, loading, refetch } = useApi<{ requests: DepositReq[]; pagination: { total: number; pages: number } }>({ url: `/api/deposit-requests?page=${page}&limit=10` })
  const { user } = useAuth()

  const requests = data?.requests || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body: { amount: number; method: string; transactionId?: string; screenshot?: string } = {
        amount: parseFloat(amount),
        method,
      }
      if (transactionId) body.transactionId = transactionId
      if (screenshot) body.screenshot = screenshot

      const res = await fetch('/api/deposit-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast('success', 'Deposit request submitted!')
      setShowForm(false)
      setAmount('')
      setMethod('bkash')
      setTransactionId('')
      setScreenshot('')
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setScreenshot(reader.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <Header title="Deposit Request" subtitle="Request wallet funds" />
      <div className="p-6 space-y-6">
        {user?.userId && (
          <GlassCard padding="p-5">
            <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-1">Your User ID</p>
            <p className="text-xl font-bold text-[var(--foreground)] font-mono">{user.userId}</p>
          </GlassCard>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard glow>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--muted)] mb-1">Submit a deposit request</p>
                <p className="text-[var(--foreground)]">Admin will review and approve your request</p>
              </div>
              <GlassButton onClick={() => setShowForm(true)}>
                <Plus size={16} /> New Request
              </GlassButton>
            </div>
          </GlassCard>
        </motion.div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div className="glass p-6 w-full max-w-md mx-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--foreground)]">Deposit Request</h3>
                <button onClick={() => setShowForm(false)} className="text-[var(--muted)] hover:text-[var(--foreground)]"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1">Amount ($)</label>
                  <input className="glass-input w-full" type="number" step="0.01" min="1" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1">Payment Method</label>
                  <GlassDropdown
                    options={METHODS.map(m => ({ value: m.value, label: m.label }))}
                    value={method}
                    onChange={setMethod}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1">Transaction ID (optional)</label>
                  <input className="glass-input w-full" placeholder="e.g. bKash ref number" value={transactionId} onChange={e => setTransactionId(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1">Screenshot (optional)</label>
                  <input className="glass-input w-full text-sm" type="file" accept="image/*" onChange={handleScreenshot} />
                  {screenshot && <img src={screenshot} alt="Screenshot" className="mt-2 max-h-32 rounded-lg" />}
                </div>
                <div className="flex gap-3 pt-2">
                  <GlassButton type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Cancel</GlassButton>
                  <GlassButton type="submit" className="flex-1" disabled={saving}>
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                    Submit Request
                  </GlassButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        <GlassCard padding="p-0">
          <div className="px-6 py-4 border-b border-[var(--card-border)]">
            <h3 className="font-bold text-[var(--foreground)]">Request History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Amount</th>
                  <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Method</th>
                  <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Transaction ID</th>
                  <th className="text-center py-3 px-4 text-[var(--muted)] font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Admin Note</th>
                  <th className="text-right py-3 px-4 text-[var(--muted)] font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="py-12 text-center"><Loader2 size={24} className="animate-spin mx-auto text-[var(--muted)]" /></td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center"><CreditCard size={40} className="mx-auto text-[var(--muted)] mb-3 opacity-50" /><p className="text-[var(--muted)]">No requests yet</p></td></tr>
                ) : (
                  requests.map((r: DepositReq, i: number) => (
                    <motion.tr key={r.id} className="border-b border-[var(--card-border)] hover:bg-white/5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                      <td className="py-3 px-4 font-bold text-[var(--foreground)]">${r.amount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-[var(--foreground)] capitalize">{r.method}</td>
                      <td className="py-3 px-4 text-[var(--foreground)] text-xs">{r.transactionId || '—'}</td>
                      <td className="py-3 px-4 text-center"><StatusBadge status={r.status} /></td>
                      <td className="py-3 px-4 text-[var(--foreground)] text-xs">{r.adminNote || '—'}</td>
                      <td className="py-3 px-4 text-right text-xs text-[var(--muted)]">{new Date(r.createdAt).toLocaleDateString()}</td>
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
      </div>
    </div>
  )
}
