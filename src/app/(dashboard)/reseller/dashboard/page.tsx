'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { timeAgo, formatDate } from '@/lib/utils'
import { OrderDetailDrawer, DetailOrder } from '@/components/admin/OrderDetailDrawer'
import { SkeletonStat, SkeletonWelcome, SkeletonTable } from '@/components/ui/Skeleton'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  ShoppingCart, Wallet, Package, CheckCircle2, Clock,
  ArrowRight, CreditCard, PlusCircle, Upload, MessageSquare,
  Smartphone, DollarSign, RefreshCw, Bell, AlertCircle,
  ArrowUpRight, ArrowDownRight, Zap, Eye,
  ChevronRight, CircleDot, XCircle, RotateCcw, BarChart3,
} from 'lucide-react'

interface DashboardData {
  totalOrders: number
  pendingOrders: number
  processingOrders: number
  completedOrders: number
  completedToday: number
  failedOrders: number
  rejectedOrders: number
  refundedOrders: number
  revenueToday: number
  revenueThisMonth: number
  todaySpending: number
  walletBalance: number
  recentOrders: {
    id: string
    orderNumber: string
    status: string
    priority?: string
    imei?: string
    deviceInfo?: string
    sellingPrice?: number
    createdAt: string
    completedAt?: string
    processingTime?: string
    serviceName?: string
    serviceType?: string
    customValues?: { value?: string | null; label?: string; fieldType?: string }[]
  }[]
  serviceCategories: {
    id: string
    name: string
    totalServices: number
    onlineServices: number
    offlineServices: number
  }[]
  userProfile?: {
    id: string
    userId: string
    name: string
    email: string
    phone?: string
    createdAt: string
    status: string
    role: string
    walletBalance: number
  } | null
  lastNotification?: {
    id: string
    title: string
    message: string
    type: string
    createdAt: string
  } | null
}

interface WalletData {
  balance: number
  transactions: {
    id: string
    type: string
    amount: number
    balanceAfter?: number
    description?: string
    createdAt: string
  }[]
}

interface NotificationItem {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  link?: string
  createdAt: string
}

interface NotificationData {
  notifications: NotificationItem[]
  unreadCount: number
}

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }

const QUICK_ACTIONS = [
  { label: 'Create Order', href: '/reseller/services', icon: PlusCircle, gradient: 'from-indigo-500 to-purple-500', shadow: 'shadow-indigo-500/20' },
  { label: 'Browse Services', href: '/reseller/services', icon: Package, gradient: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/20' },
  { label: 'Deposit Funds', href: '/reseller/wallet', icon: CreditCard, gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/20' },
  { label: 'Bulk IMEI Order', href: '/reseller/bulk-orders', icon: Upload, gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/20' },
  { label: 'Support Ticket', href: '/reseller/orders', icon: MessageSquare, gradient: 'from-pink-500 to-rose-500', shadow: 'shadow-pink-500/20' },
]

const NOTIFICATION_ICONS: Record<string, typeof Bell> = {
  success: CheckCircle2,
  warning: AlertCircle,
  error: XCircle,
  info: Bell,
}

const NOTIFICATION_COLORS: Record<string, string> = {
  success: 'text-emerald-400 bg-emerald-500/10',
  warning: 'text-amber-400 bg-amber-500/10',
  error: 'text-red-400 bg-red-500/10',
  info: 'text-blue-400 bg-blue-500/10',
}

export default function ResellerDashboard() {
  const { toast } = useToast()
  const { user } = useAuth()
  const { data: stats, loading: statsLoading } = useApi<DashboardData>({ url: '/api/dashboard' })
  const { data: walletRes, loading: walletLoading } = useApi<WalletData>({ url: '/api/wallet' })
  const { data: notifRes } = useApi<NotificationData>({ url: '/api/notifications?limit=10' })

  const [viewOrder, setViewOrder] = useState<DetailOrder | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const orderId = params.get('order')
    if (orderId) {
      loadDetail(orderId)
      window.history.replaceState({}, '', '/reseller/dashboard')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadDetail = async (id: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/orders/${id}`, { credentials: 'same-origin' })
      if (res.ok) setViewOrder(await res.json())
      else toast('error', 'Failed to load order')
    } catch {
      toast('error', 'Failed to load order')
    } finally {
      setDetailLoading(false)
    }
  }

  const s = stats
  const wallet = walletRes
  const notifications = notifRes?.notifications || []
  const unreadCount = notifRes?.unreadCount || 0
  const transactions = wallet?.transactions || []
  const profile = s?.userProfile
  const isLoading = statsLoading || walletLoading

  const memberSince = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'
  const lastDeposit = transactions.find((t) => t.type === 'deposit')
  const totalRefunds = transactions.filter((t) => t.type === 'order_refund').reduce((sum, t) => sum + Math.abs(t.amount), 0)

  if (isLoading) {
    return (
      <div>
        <Header title="Dashboard" subtitle="Loading..." />
        <div className="p-6 space-y-6">
          <SkeletonWelcome />
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonStat key={i} />)}
          </div>
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonStat key={i} />)}
          </div>
          <SkeletonTable rows={5} cols={7} />
        </div>
      </div>
    )
  }

  const progressSteps = [
    { label: 'Pending', count: s?.pendingOrders || 0, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/15' },
    { label: 'Processing', count: s?.processingOrders || 0, icon: RefreshCw, color: 'text-blue-400', bg: 'bg-blue-500/15' },
    { label: 'Completed', count: s?.completedToday || 0, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
    { label: 'Rejected', count: (s?.rejectedOrders || 0) + (s?.failedOrders || 0), icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/15' },
    { label: 'Refunded', count: s?.refundedOrders || 0, icon: RotateCcw, color: 'text-purple-400', bg: 'bg-purple-500/15' },
  ]

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle={profile ? `Welcome back, ${profile.name}` : 'Welcome back'}
      />

      <div className="p-6 space-y-6">
        {/* Welcome Section */}
        <motion.div {...fadeUp} transition={{ delay: 0 }}>
          <GlassCard padding="p-0" className="overflow-hidden">
            <div className="relative p-6 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
              <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-[var(--muted)]">Welcome Back</p>
                  <h2 className="text-2xl font-bold text-[var(--foreground)]">{profile?.name || user?.name || 'Client'}</h2>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5 text-[var(--muted)]">
                      <Smartphone size={13} /> {profile?.userId || user?.userId || '—'}
                    </span>
                    <span className="flex items-center gap-1.5 text-[var(--muted)]">
                      <BarChart3 size={13} /> {profile?.role === 'admin' ? 'Admin' : 'Client'}
                    </span>
                    {profile?.status === 'active' && (
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Active
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-[var(--muted)]">
                      <Clock size={13} /> Since {memberSince}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Link href="/reseller/services">
                    <button className="glass-premium px-4 py-2.5 rounded-2xl text-sm font-medium text-[var(--foreground)] hover:bg-white/10 transition-all flex items-center gap-2">
                      <PlusCircle size={16} /> New Order
                    </button>
                  </Link>
                  <Link href="/reseller/wallet">
                    <button className="bg-gradient-to-r from-[var(--accent)] to-purple-500 px-4 py-2.5 rounded-2xl text-sm font-medium text-white shadow-lg shadow-[var(--accent)]/20 hover:shadow-[var(--accent)]/40 transition-all flex items-center gap-2">
                      <CreditCard size={16} /> Deposit
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* 6 Stat Cards */}
        <motion.div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4" {...fadeUp} transition={{ delay: 0.05 }}>
          <StatCardLink href="/reseller/wallet" title="Wallet Balance" value={`$${(s?.walletBalance || 0).toLocaleString()}`} icon={Wallet} color="emerald" />
          <StatCardLink href="/reseller/orders?status=pending" title="Pending Orders" value={s?.pendingOrders || 0} icon={Clock} color="amber" />
          <StatCardLink href="/reseller/orders?status=processing" title="Processing" value={s?.processingOrders || 0} icon={RefreshCw} color="blue" />
          <StatCardLink href="/reseller/orders?status=completed" title="Completed Today" value={s?.completedToday || 0} icon={CheckCircle2} color="green" />
          <StatCardLink href="/reseller/orders" title="Total Orders" value={(s?.totalOrders || 0).toLocaleString()} icon={ShoppingCart} color="indigo" />
          <StatCardLink href="/reseller/wallet" title="Today's Spending" value={`$${(s?.todaySpending || 0).toLocaleString()}`} icon={DollarSign} color="rose" />
        </motion.div>

        {/* Quick Actions */}
        <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.label} href={action.href}>
                <GlassCard hover padding="p-4" className="group cursor-pointer">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${action.gradient} ${action.shadow} shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <action.icon size={20} className="text-white" />
                    </div>
                    <span className="text-sm font-medium text-[var(--foreground)]">{action.label}</span>
                  </div>
                </GlassCard>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Main Content + Right Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Latest Orders */}
            <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
              <GlassCard padding="p-0">
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <h3 className="text-lg font-bold text-[var(--foreground)]">Latest Orders</h3>
                  <Link href="/reseller/orders" className="text-sm text-[var(--accent)] hover:underline flex items-center gap-1">
                    View All <ChevronRight size={14} />
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--card-border)]">
                        <th className="text-left py-3 px-5 text-[var(--muted)] font-medium text-xs uppercase tracking-wider">Order ID</th>
                        <th className="text-left py-3 px-2 text-[var(--muted)] font-medium text-xs uppercase tracking-wider">Service</th>
                        <th className="text-left py-3 px-2 text-[var(--muted)] font-medium text-xs uppercase tracking-wider">IMEI/SN</th>
                        <th className="text-left py-3 px-2 text-[var(--muted)] font-medium text-xs uppercase tracking-wider">Status</th>
                        <th className="text-right py-3 px-2 text-[var(--muted)] font-medium text-xs uppercase tracking-wider">Price</th>
                        <th className="text-left py-3 px-2 text-[var(--muted)] font-medium text-xs uppercase tracking-wider">Submitted</th>
                        <th className="text-left py-3 px-2 text-[var(--muted)] font-medium text-xs uppercase tracking-wider">Est. Time</th>
                        <th className="text-right py-3 px-5 text-[var(--muted)] font-medium text-xs uppercase tracking-wider">View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(s?.recentOrders || []).map((order) => (
                        <tr
                          key={order.id}
                          className="border-b border-[var(--card-border)] hover:bg-white/5 transition-colors cursor-pointer"
                          onClick={() => loadDetail(order.id)}
                        >
                          <td className="py-3 px-5 font-mono font-medium text-[var(--foreground)]">{order.orderNumber}</td>
                          <td className="py-3 px-2 text-[var(--foreground)] truncate max-w-[140px]">{order.serviceName || 'N/A'}</td>
                          <td className="py-3 px-2 font-mono text-xs text-[var(--muted)] truncate max-w-[120px]">{resolveOrderImei(order)}</td>
                          <td className="py-3 px-2"><StatusBadge status={order.status} /></td>
                          <td className="py-3 px-2 text-right font-medium text-[var(--foreground)]">${(order.sellingPrice || 0).toFixed(2)}</td>
                          <td className="py-3 px-2 text-xs text-[var(--muted)]">{timeAgo(order.createdAt)} ago</td>
                          <td className="py-3 px-2 text-xs text-[var(--muted)]">{order.processingTime || '—'}</td>
                          <td className="py-3 px-5 text-right">
                            <button className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--accent)] hover:bg-white/10 transition-colors">
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(!s?.recentOrders || s.recentOrders.length === 0) && (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-[var(--muted)]">
                            <ShoppingCart size={32} className="mx-auto mb-3 opacity-40" />
                            <p>No orders yet</p>
                            <Link href="/reseller/services" className="text-[var(--accent)] text-sm hover:underline mt-1 inline-block">Place your first order</Link>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </motion.div>

            {/* Order Progress */}
            <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
              <GlassCard>
                <h3 className="text-lg font-bold text-[var(--foreground)] mb-4">Order Progress</h3>
                <div className="grid grid-cols-5 gap-3">
                  {progressSteps.map((step, i) => (
                    <div key={step.label} className="flex flex-col items-center gap-2">
                      <div className={`w-12 h-12 rounded-2xl ${step.bg} flex items-center justify-center`}>
                        <step.icon size={20} className={step.color} />
                      </div>
                      <span className="text-2xl font-bold text-[var(--foreground)]">{step.count}</span>
                      <span className="text-xs text-[var(--muted)] text-center">{step.label}</span>
                      {i < progressSteps.length - 1 && (
                        <div className="hidden lg:block absolute" />
                      )}
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>

            {/* Services Overview */}
            <motion.div {...fadeUp} transition={{ delay: 0.25 }}>
              <GlassCard>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-[var(--foreground)]">Services Overview</h3>
                  <Link href="/reseller/services" className="text-sm text-[var(--accent)] hover:underline flex items-center gap-1">
                    Browse <ChevronRight size={14} />
                  </Link>
                </div>
                {(!s?.serviceCategories || s.serviceCategories.length === 0) ? (
                  <div className="py-8 text-center text-[var(--muted)]">
                    <Package size={32} className="mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No service categories available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {s.serviceCategories.map((cat) => (
                      <Link key={cat.id} href="/reseller/services">
                        <div className="p-4 rounded-2xl bg-white/5 border border-[var(--card-border)] hover:bg-white/8 hover:border-[var(--accent)]/30 transition-all cursor-pointer group">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <Smartphone size={18} className="text-[var(--accent)]" />
                          </div>
                          <p className="font-medium text-sm text-[var(--foreground)] truncate">{cat.name}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs text-emerald-400 flex items-center gap-1">
                              <CircleDot size={10} /> {cat.onlineServices} online
                            </span>
                            {cat.offlineServices > 0 && (
                              <span className="text-xs text-red-400 flex items-center gap-1">
                                <XCircle size={10} /> {cat.offlineServices} offline
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </GlassCard>
            </motion.div>

            {/* Wallet Section */}
            <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
              <GlassCard>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-[var(--foreground)]">Wallet</h3>
                  <Link href="/reseller/wallet" className="text-sm text-[var(--accent)] hover:underline flex items-center gap-1">
                    View All <ChevronRight size={14} />
                  </Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/15">
                    <p className="text-xs text-[var(--muted)] mb-1">Balance</p>
                    <p className="text-lg font-bold text-emerald-400">${(wallet?.balance || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/15">
                    <p className="text-xs text-[var(--muted)] mb-1">Today&apos;s Spending</p>
                    <p className="text-lg font-bold text-blue-400">${(s?.todaySpending || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/15">
                    <p className="text-xs text-[var(--muted)] mb-1">Last Deposit</p>
                    <p className="text-lg font-bold text-indigo-400">
                      {lastDeposit ? `$${lastDeposit.amount.toLocaleString()}` : '—'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/15">
                    <p className="text-xs text-[var(--muted)] mb-1">Refunds</p>
                    <p className="text-lg font-bold text-purple-400">${totalRefunds.toLocaleString()}</p>
                  </div>
                </div>
                {/* Recent Transactions */}
                {transactions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Recent Transactions</p>
                    {transactions.slice(0, 5).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${tx.amount >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                            {tx.amount >= 0 ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[var(--foreground)] capitalize">{tx.type.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-[var(--muted)]">{tx.description || formatDate(tx.createdAt)}</p>
                          </div>
                        </div>
                        <span className={`font-bold text-sm ${tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {tx.amount >= 0 ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4">
                  <Link href="/reseller/deposit-request">
                    <button className="w-full py-3 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-purple-500 text-white font-medium text-sm shadow-lg shadow-[var(--accent)]/20 hover:shadow-[var(--accent)]/40 transition-all flex items-center justify-center gap-2">
                      <CreditCard size={16} /> Quick Deposit
                    </button>
                  </Link>
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            {/* Announcements (using notifications) */}
            <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
              <GlassCard>
                <div className="flex items-center gap-2 mb-4">
                  <Bell size={16} className="text-amber-400" />
                  <h3 className="font-bold text-[var(--foreground)]">Announcements</h3>
                </div>
                {notifications.filter((n) => n.type === 'warning' || n.type === 'info').length === 0 ? (
                  <div className="py-6 text-center">
                    <Bell size={24} className="mx-auto text-[var(--muted)] mb-2 opacity-40" />
                    <p className="text-sm text-[var(--muted)]">No announcements</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.filter((n) => n.type === 'warning' || n.type === 'info').slice(0, 3).map((n) => (
                      <div key={n.id} className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                        <p className="text-sm font-medium text-[var(--foreground)]">{n.title}</p>
                        <p className="text-xs text-[var(--muted)] mt-1 line-clamp-2">{n.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </motion.div>

            {/* Recent Notifications */}
            <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
              <GlassCard>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Bell size={16} className="text-[var(--accent)]" />
                    <h3 className="font-bold text-[var(--foreground)]">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] text-[10px] font-bold">{unreadCount}</span>
                    )}
                  </div>
                </div>
                {notifications.length === 0 ? (
                  <div className="py-6 text-center">
                    <Bell size={24} className="mx-auto text-[var(--muted)] mb-2 opacity-40" />
                    <p className="text-sm text-[var(--muted)]">No notifications</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.slice(0, 6).map((n) => {
                      const Icon = NOTIFICATION_ICONS[n.type] || Bell
                      const colorClass = NOTIFICATION_COLORS[n.type] || NOTIFICATION_COLORS.info
                      return (
                        <div key={n.id} className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${n.read ? 'bg-white/3' : 'bg-white/5 border border-[var(--card-border)]'}`}>
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                            <Icon size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[var(--foreground)] truncate">{n.title}</p>
                            <p className="text-xs text-[var(--muted)] truncate">{n.message}</p>
                            <p className="text-[10px] text-[var(--muted)] mt-1">{timeAgo(n.createdAt)} ago</p>
                          </div>
                          {!n.read && <div className="w-2 h-2 rounded-full bg-[var(--accent)] mt-2 flex-shrink-0" />}
                        </div>
                      )
                    })}
                  </div>
                )}
              </GlassCard>
            </motion.div>

            {/* Wallet Summary */}
            <motion.div {...fadeUp} transition={{ delay: 0.25 }}>
              <GlassCard>
                <div className="flex items-center gap-2 mb-4">
                  <Wallet size={16} className="text-emerald-400" />
                  <h3 className="font-bold text-[var(--foreground)]">Wallet Summary</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--muted)]">Current Balance</span>
                    <span className="text-sm font-bold text-emerald-400">${(wallet?.balance || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--muted)]">Today&apos;s Spending</span>
                    <span className="text-sm font-medium text-[var(--foreground)]">${(s?.todaySpending || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--muted)]">Total Transactions</span>
                    <span className="text-sm font-medium text-[var(--foreground)]">{transactions.length}</span>
                  </div>
                </div>
                <Link href="/reseller/wallet" className="block mt-4">
                  <button className="w-full py-2.5 rounded-xl bg-white/5 border border-[var(--card-border)] text-sm font-medium text-[var(--foreground)] hover:bg-white/8 transition-colors">
                    View Wallet
                  </button>
                </Link>
              </GlassCard>
            </motion.div>

            {/* Order Shortcut / Favorite Services */}
            <motion.div {...fadeUp} transition={{ delay: 0.35 }}>
              <GlassCard>
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={16} className="text-amber-400" />
                  <h3 className="font-bold text-[var(--foreground)]">Quick Reorder</h3>
                </div>
                {transactions.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-[var(--muted)]">Recent Services</p>
                    {transactions.filter((t) => t.type === 'order_payment').slice(0, 3).map((tx) => (
                      <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-[var(--card-border)] hover:bg-white/8 transition-colors cursor-pointer">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                          <Smartphone size={14} className="text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--foreground)] truncate">{tx.description || 'Service Order'}</p>
                          <p className="text-xs text-[var(--muted)]">${Math.abs(tx.amount).toFixed(2)}</p>
                        </div>
                        <ArrowRight size={14} className="text-[var(--muted)]" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Link href="/reseller/services">
                    <div className="p-4 rounded-xl bg-white/5 border border-dashed border-[var(--card-border)] text-center hover:border-[var(--accent)]/30 transition-colors cursor-pointer">
                      <Zap size={20} className="mx-auto text-[var(--muted)] mb-2" />
                      <p className="text-sm text-[var(--muted)]">Place an order to see shortcuts here</p>
                    </div>
                  </Link>
                )}
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </div>

      <OrderDetailDrawer
        open={!!viewOrder}
        onClose={() => setViewOrder(null)}
        order={viewOrder}
        loading={detailLoading}
        role="client"
        onUpdate={() => { if (viewOrder) loadDetail(viewOrder.id) }}
      />
    </div>
  )
}

function resolveOrderImei(order: { imei?: string; deviceInfo?: string; customValues?: { value?: string | null; label?: string; fieldType?: string }[] }): string {
  if (order.imei || order.deviceInfo) return order.imei || order.deviceInfo || ''
  const cv = (order.customValues || []).find(
    (v) => v.fieldType === 'imei_single' || (v.label || '').toLowerCase().includes('imei'),
  )
  return cv?.value || '—'
}

function StatCardLink({ href, title, value, icon: Icon, color }: {
  href: string
  title: string
  value: string | number
  icon: typeof Wallet
  color: string
}) {
  const colorMap: Record<string, string> = {
    emerald: 'from-emerald-500 to-teal-500 shadow-emerald-500/30',
    amber: 'from-amber-500 to-orange-500 shadow-amber-500/30',
    blue: 'from-blue-500 to-cyan-500 shadow-blue-500/30',
    green: 'from-green-500 to-emerald-500 shadow-green-500/30',
    indigo: 'from-indigo-500 to-blue-500 shadow-indigo-500/30',
    rose: 'from-rose-500 to-pink-500 shadow-rose-500/30',
  }
  const c = colorMap[color] || colorMap.blue

  return (
    <Link href={href}>
      <motion.div
        className="glass-premium p-4 relative overflow-hidden group cursor-pointer"
        whileHover={{ scale: 1.02, y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs text-[var(--muted)] font-medium">{title}</p>
            <p className="text-xl font-bold text-[var(--foreground)]">{value}</p>
          </div>
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c} shadow-lg flex items-center justify-center`}>
            <Icon size={18} className="text-white" />
          </div>
        </div>
        <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-white/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </motion.div>
    </Link>
  )
}
