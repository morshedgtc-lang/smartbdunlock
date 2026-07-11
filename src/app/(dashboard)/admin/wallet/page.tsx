'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useApi } from '@/lib/useApi'
import { useToast } from '@/components/ui/Toast'
import { motion } from 'framer-motion'
import { ArrowDownToLine, ArrowUpFromLine, Send, Loader2, X, Wallet } from 'lucide-react'
import { useState } from 'react'

export default function AdminWalletPage() {
  const [showModal, setShowModal] = useState<string | null>(null)
  const [targetEmail, setTargetEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const { data: walletData, loading: walletLoading, refetch: refetchWallet } = useApi<any>({ url: '/api/wallet' })
  const { data: usersData, refetch: refetchUsers } = useApi<any>({ url: '/api/users' })

  const balance = walletData?.balance ?? 0
  const transactions = walletData?.transactions || []
  const users = usersData?.users || []

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const targetUser = users.find((u: any) => u.email === targetEmail)
      if (!targetUser && showModal === 'transfer') throw new Error('User not found')

      const body: any = {
        type: showModal,
        amount: parseFloat(amount),
        description: description || undefined,
      }
      if (showModal === 'transfer' && targetUser) {
        body.targetUserId = targetUser.id
      }

      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast('success', `${showModal === 'deposit' ? 'Deposit' : 'Transfer'} successful`)
      setShowModal(null)
      setTargetEmail('')
      setAmount('')
      setDescription('')
      refetchWallet()
      refetchUsers()
    } catch (err: any) {
      toast('error', err.message)
    } finally {
      setSaving(false)
    }
  }

  if (walletLoading) {
    return (
      <div>
        <Header title="Wallet" subtitle="Loading..." />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Wallet" subtitle="Manage funds" />
      <div className="p-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard glow>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm text-[var(--muted)] mb-1">Your Balance</p>
                <p className="text-4xl font-bold text-[var(--foreground)]">${balance.toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <GlassButton size="sm" onClick={() => setShowModal('deposit')}><ArrowDownToLine size={16} /> Deposit</GlassButton>
                <GlassButton size="sm" variant="secondary" onClick={() => setShowModal('transfer')}><Send size={16} /> Transfer to Reseller</GlassButton>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div className="glass p-6 w-full max-w-md mx-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--foreground)]">{showModal === 'deposit' ? 'Deposit Funds' : 'Transfer to Reseller'}</h3>
                <button onClick={() => setShowModal(null)} className="text-[var(--muted)] hover:text-[var(--foreground)]"><X size={20} /></button>
              </div>
              <form onSubmit={handleTransaction} className="space-y-3">
                {showModal === 'transfer' && (
                  <div>
                    <label className="block text-xs text-[var(--muted)] mb-1">Reseller Email</label>
                    <input className="glass-input w-full" type="email" placeholder="reseller@email.com" value={targetEmail} onChange={e => setTargetEmail(e.target.value)} required />
                  </div>
                )}
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1">Amount ($)</label>
                  <input className="glass-input w-full" type="number" step="0.01" min="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1">Description (optional)</label>
                  <input className="glass-input w-full" placeholder="e.g. Monthly balance" value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                <div className="flex gap-3 pt-2">
                  <GlassButton type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(null)}>Cancel</GlassButton>
                  <GlassButton type="submit" className="flex-1" disabled={saving}>
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                    Confirm
                  </GlassButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        <GlassCard padding="p-0">
          <div className="px-6 py-4 border-b border-[var(--card-border)]">
            <h3 className="font-bold text-[var(--foreground)]">Transaction History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Type</th>
                  <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Description</th>
                  <th className="text-right py-3 px-4 text-[var(--muted)] font-medium">Amount</th>
                  <th className="text-right py-3 px-4 text-[var(--muted)] font-medium">Balance</th>
                  <th className="text-right py-3 px-4 text-[var(--muted)] font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn: any, i: number) => (
                  <motion.tr key={txn.id} className="border-b border-[var(--card-border)] hover:bg-white/5 dark:hover:bg-white/5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                    <td className="py-3 px-4"><StatusBadge status={txn.type} /></td>
                    <td className="py-3 px-4 text-[var(--foreground)]">{txn.description || '—'}</td>
                    <td className={`py-3 px-4 text-right font-bold ${txn.amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {txn.amount >= 0 ? '+' : ''}${Math.abs(txn.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--foreground)]">${txn.balanceAfter?.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-xs text-[var(--muted)]">{new Date(txn.createdAt).toLocaleDateString()}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
