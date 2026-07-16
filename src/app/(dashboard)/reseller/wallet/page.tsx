'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { motion } from 'framer-motion'
import { Loader2, Wallet } from 'lucide-react'
import Link from 'next/link'

interface TransactionItem {
  id: string
  type: string
  description?: string
  amount: number
  balanceAfter?: number
  createdAt: string
}

export default function ClientWalletPage() {
  const { data: walletData, loading: walletLoading, error: walletError } = useApi<{ balance: number; transactions: TransactionItem[] }>({ url: '/api/wallet' })

  const balance = walletData?.balance ?? 0
  const transactions = walletData?.transactions || []

  if (walletLoading) {
    return (
      <div>
        <Header title="My Wallet" subtitle="Loading..." />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
        </div>
      </div>
    )
  }

  if (walletError) {
    return (
      <div>
        <Header title="My Wallet" />
        <div className="p-6 flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-red-400 text-sm">{walletError}</p>
          <Link href="/login" className="text-[var(--accent)] text-sm hover:underline">Go to Login</Link>
        </div>
      </div>
    )
  }
  return (
    <div>
      <Header title="My Wallet" subtitle="Manage your balance" />
      <div className="p-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard glow>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm text-[var(--muted)] mb-1">Available Balance</p>
                <p className="text-4xl font-bold text-[var(--foreground)]">${balance.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                <Wallet size={16} />
                <span>Contact admin to add funds</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

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
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <Wallet size={40} className="mx-auto text-[var(--muted)] mb-3 opacity-50" />
                      <p className="text-[var(--muted)]">No transactions yet</p>
                    </td>
                  </tr>
                ) : (
                  transactions.map((txn: TransactionItem, i: number) => (
                    <motion.tr key={txn.id} className="border-b border-[var(--card-border)] hover:bg-white/5 dark:hover:bg-white/5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                      <td className="py-3 px-4"><StatusBadge status={txn.type} /></td>
                      <td className="py-3 px-4 text-[var(--foreground)]">{txn.description || '—'}</td>
                      <td className={`py-3 px-4 text-right font-bold ${txn.amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {txn.amount >= 0 ? '+' : ''}${Math.abs(txn.amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-[var(--foreground)]">${txn.balanceAfter?.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-xs text-[var(--muted)]">{new Date(txn.createdAt).toLocaleDateString()}</td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
