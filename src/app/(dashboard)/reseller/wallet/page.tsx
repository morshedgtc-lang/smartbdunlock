'use client'

import { useState, useMemo } from 'react'
import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassInput } from '@/components/ui/GlassInput'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Wallet,
  Loader2,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  ShoppingCart,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  Hash,
  FileText,
  Clock,
  Banknote,
  CircleDollarSign,
  Settings2,
  AlertCircle,
} from 'lucide-react'

interface TransactionItem {
  id: string
  type: string
  description?: string
  amount: number
  balanceAfter?: number
  createdAt: string
}

interface WalletData {
  balance: number
  transactions: TransactionItem[]
}

const PAGE_SIZE = 10

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'order_payment', label: 'Order Payment' },
  { value: 'order_refund', label: 'Refund' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'withdraw', label: 'Withdraw' },
  { value: 'admin_adjustment', label: 'Adjustment' },
] as const

const TYPE_CONFIG: Record<string, { icon: typeof Wallet; colorClass: string; bgClass: string }> = {
  deposit: { icon: Banknote, colorClass: 'text-emerald-500', bgClass: 'bg-emerald-500/10' },
  order_payment: { icon: ShoppingCart, colorClass: 'text-red-500', bgClass: 'bg-red-500/10' },
  order_refund: { icon: RefreshCw, colorClass: 'text-purple-500', bgClass: 'bg-purple-500/10' },
  transfer: { icon: ArrowRightLeft, colorClass: 'text-blue-500', bgClass: 'bg-blue-500/10' },
  withdraw: { icon: TrendingDown, colorClass: 'text-amber-500', bgClass: 'bg-amber-500/10' },
  admin_adjustment: { icon: Settings2, colorClass: 'text-[var(--muted)]', bgClass: 'bg-[var(--muted)]/10' },
}

function formatCurrency(amount: number): string {
  return `$${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function exportToCSV(transactions: TransactionItem[]): void {
  const headers = ['Type', 'Description', 'Amount', 'Balance After', 'Date']
  const rows = transactions.map(txn => [
    txn.type.replace(/_/g, ' '),
    (txn.description || '—').replace(/,/g, ';'),
    txn.amount >= 0 ? `+${txn.amount.toFixed(2)}` : txn.amount.toFixed(2),
    txn.balanceAfter?.toFixed(2) ?? '',
    new Date(txn.createdAt).toLocaleString(),
  ])

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `wallet-transactions-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export default function ResellerWalletPage() {
  const { data: walletData, loading, error } = useApi<WalletData>({ url: '/api/wallet' })
  const { user } = useAuth()
  const { toast } = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  const balance = walletData?.balance ?? 0

  const stats = useMemo(() => {
    const txns = walletData?.transactions ?? []
    let totalCredit = 0
    let totalDebit = 0
    let lastDeposit: TransactionItem | null = null

    for (const txn of txns) {
      if (txn.amount >= 0) {
        totalCredit += txn.amount
      } else {
        totalDebit += Math.abs(txn.amount)
      }

      if (!lastDeposit && txn.type === 'deposit') {
        lastDeposit = txn
      }
    }

    return {
      totalCredit,
      totalDebit,
      lastDeposit,
      transactionCount: txns.length,
    }
  }, [walletData?.transactions])

  const filteredTransactions = useMemo(() => {
    let result = walletData?.transactions ?? []

    if (typeFilter !== 'all') {
      result = result.filter(txn => txn.type === typeFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        txn =>
          (txn.description && txn.description.toLowerCase().includes(q)) ||
          txn.type.replace(/_/g, ' ').toLowerCase().includes(q)
      )
    }

    return result
  }, [walletData?.transactions, typeFilter, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedTransactions = filteredTransactions.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  )

  const handleExport = () => {
    if (filteredTransactions.length === 0) {
      toast('warning', 'No transactions to export')
      return
    }
    exportToCSV(filteredTransactions)
    toast('success', `Exported ${filteredTransactions.length} transactions`)
  }

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value)
    setCurrentPage(1)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  if (loading) {
    return (
      <div>
        <Header title="Wallet" subtitle="Loading..." />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Header title="Wallet" />
        <div className="p-6 flex flex-col items-center justify-center py-20 gap-4">
          <AlertCircle size={40} className="text-red-400" />
          <p className="text-red-400 text-sm">{error}</p>
          <Link href="/reseller/dashboard" className="text-[var(--accent)] text-sm hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Wallet" subtitle="Manage your balance and transactions" />

      <div className="p-6 space-y-6">
        {/* Balance Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <GlassCard glow padding="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30 flex items-center justify-center">
                    <Wallet size={20} className="text-white" />
                  </div>
                  <p className="text-sm font-medium text-[var(--muted)] uppercase tracking-wider">Available Balance</p>
                </div>
                <p className="text-4xl sm:text-5xl font-bold text-[var(--foreground)]">
                  {formatCurrency(balance)}
                </p>
                {user?.userId && (
                  <p className="text-xs text-[var(--muted)] font-mono">
                    User ID: {user.userId}
                  </p>
                )}
              </div>
              <Link href="/reseller/deposit-request">
                <GlassButton variant="primary" size="lg">
                  <Plus size={18} />
                  Quick Deposit
                </GlassButton>
              </Link>
            </div>
          </GlassCard>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <StatCard
            title="Total Credit"
            value={formatCurrency(stats.totalCredit)}
            icon={TrendingUp}
            color="green"
            changeType="up"
            change="All time"
          />
          <StatCard
            title="Total Debit"
            value={formatCurrency(stats.totalDebit)}
            icon={TrendingDown}
            color="red"
            changeType="down"
            change="All time"
          />
          <StatCard
            title="Last Deposit"
            value={stats.lastDeposit ? formatCurrency(stats.lastDeposit.amount) : '$0.00'}
            icon={CircleDollarSign}
            color="blue"
            change={stats.lastDeposit ? new Date(stats.lastDeposit.createdAt).toLocaleDateString() : 'No deposits'}
            changeType="neutral"
          />
          <StatCard
            title="Transactions"
            value={stats.transactionCount}
            icon={Hash}
            color="purple"
            change="All time"
            changeType="neutral"
          />
        </motion.div>

        {/* Transaction History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <GlassCard padding="p-0">
            {/* Table Header */}
            <div className="px-6 py-4 border-b border-[var(--card-border)]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h3 className="font-bold text-[var(--foreground)] flex items-center gap-2">
                  <FileText size={18} className="text-[var(--accent)]" />
                  Transaction History
                </h3>
                <GlassButton variant="ghost" size="sm" onClick={handleExport}>
                  <Download size={14} />
                  Export CSV
                </GlassButton>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4">
                <div className="flex-1 w-full sm:max-w-xs">
                  <GlassInput
                    placeholder="Search transactions..."
                    icon={Search}
                    value={searchQuery}
                    onChange={e => handleSearchChange(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TYPE_FILTER_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleTypeFilterChange(opt.value)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                        typeFilter === opt.value
                          ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/25'
                          : 'bg-[var(--card-bg)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-bg)]/80 border border-[var(--card-border)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--card-border)]">
                    <th className="text-left py-3 px-4 text-[var(--muted)] font-medium text-xs uppercase tracking-wider">Type</th>
                    <th className="text-left py-3 px-4 text-[var(--muted)] font-medium text-xs uppercase tracking-wider">Description</th>
                    <th className="text-right py-3 px-4 text-[var(--muted)] font-medium text-xs uppercase tracking-wider">Amount</th>
                    <th className="text-right py-3 px-4 text-[var(--muted)] font-medium text-xs uppercase tracking-wider hidden sm:table-cell">Balance After</th>
                    <th className="text-right py-3 px-4 text-[var(--muted)] font-medium text-xs uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="wait">
                    {paginatedTransactions.length === 0 ? (
                      <motion.tr
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <td colSpan={5} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-2xl bg-[var(--card-bg)] flex items-center justify-center">
                              <Wallet size={28} className="text-[var(--muted)] opacity-50" />
                            </div>
                            <div>
                              <p className="text-[var(--muted)] font-medium">No transactions found</p>
                              <p className="text-[var(--muted)]/60 text-xs mt-1">
                                {searchQuery || typeFilter !== 'all'
                                  ? 'Try adjusting your filters'
                                  : 'Transactions will appear here once you make your first transaction'}
                              </p>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    ) : (
                      paginatedTransactions.map((txn, i) => {
                        const config = TYPE_CONFIG[txn.type] || TYPE_CONFIG.admin_adjustment
                        const TxnIcon = config.icon
                        const isCredit = txn.amount >= 0

                        return (
                          <motion.tr
                            key={txn.id}
                            className="border-b border-[var(--card-border)] hover:bg-white/5 dark:hover:bg-white/5 transition-colors"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2, delay: i * 0.03 }}
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-lg ${config.bgClass} flex items-center justify-center flex-shrink-0`}>
                                  <TxnIcon size={14} className={config.colorClass} />
                                </div>
                                <span className="hidden sm:block">
                                  <StatusBadge status={txn.type} />
                                </span>
                                <span className="sm:hidden">
                                  <StatusBadge status={txn.type} />
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-[var(--foreground)] max-w-[200px] truncate">
                              {txn.description || '—'}
                            </td>
                            <td className={`py-3.5 px-4 text-right font-bold ${isCredit ? 'text-emerald-500' : 'text-red-500'}`}>
                              <span className="flex items-center justify-end gap-1">
                                {isCredit ? (
                                  <ArrowUpRight size={14} className="text-emerald-500" />
                                ) : (
                                  <ArrowDownRight size={14} className="text-red-500" />
                                )}
                                {isCredit ? '+' : '-'}{formatCurrency(txn.amount)}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right text-[var(--foreground)] hidden sm:table-cell">
                              {txn.balanceAfter != null ? formatCurrency(txn.balanceAfter) : '—'}
                            </td>
                            <td className="py-3.5 px-4 text-right text-xs text-[var(--muted)] whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <Clock size={12} className="hidden sm:block" />
                                {new Date(txn.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                                <span className="hidden md:inline">
                                  {new Date(txn.createdAt).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            </td>
                          </motion.tr>
                        )
                      })
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredTransactions.length > PAGE_SIZE && (
              <div className="px-6 py-4 border-t border-[var(--card-border)] flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-[var(--muted)]">
                  Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredTransactions.length)} of {filteredTransactions.length} transactions
                </p>
                <div className="flex items-center gap-2">
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                  >
                    <ChevronLeft size={14} />
                    Prev
                  </GlassButton>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        if (totalPages <= 5) return true
                        if (page === 1 || page === totalPages) return true
                        if (Math.abs(page - safePage) <= 1) return true
                        return false
                      })
                      .reduce<(number | string)[]>((acc, page, idx, arr) => {
                        if (idx > 0 && typeof arr[idx - 1] === 'number' && page - (arr[idx - 1] as number) > 1) {
                          acc.push('...')
                        }
                        acc.push(page)
                        return acc
                      }, [])
                      .map((item, idx) =>
                        typeof item === 'string' ? (
                          <span key={`ellipsis-${idx}`} className="text-[var(--muted)] text-xs px-1">
                            ...
                          </span>
                        ) : (
                          <button
                            key={item}
                            onClick={() => setCurrentPage(item)}
                            className={`w-8 h-8 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                              item === safePage
                                ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/25'
                                : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-bg)]'
                            }`}
                          >
                            {item}
                          </button>
                        )
                      )}
                  </div>
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                  >
                    Next
                    <ChevronRight size={14} />
                  </GlassButton>
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/reseller/deposit-request">
              <GlassCard hover padding="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30 flex items-center justify-center flex-shrink-0">
                    <Plus size={22} className="text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-[var(--foreground)]">Request Deposit</p>
                    <p className="text-xs text-[var(--muted)]">Add funds to your wallet</p>
                  </div>
                  <ArrowRightLeft size={16} className="text-[var(--muted)] ml-auto" />
                </div>
              </GlassCard>
            </Link>
            <Link href="/reseller/orders">
              <GlassCard hover padding="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30 flex items-center justify-center flex-shrink-0">
                    <ShoppingCart size={22} className="text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-[var(--foreground)]">View Orders</p>
                    <p className="text-xs text-[var(--muted)]">Manage your order history</p>
                  </div>
                  <ArrowRightLeft size={16} className="text-[var(--muted)] ml-auto" />
                </div>
              </GlassCard>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
