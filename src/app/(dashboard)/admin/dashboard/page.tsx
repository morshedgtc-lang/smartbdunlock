'use client'

import { Header } from '@/components/layout/Header'
import { StatCard } from '@/components/ui/StatCard'
import { GlassCard } from '@/components/ui/GlassCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SkeletonCard, SkeletonStat } from '@/components/ui/Skeleton'
import { useApi } from '@/hooks/useApi'
import { useToast } from '@/components/ui/Toast'
import { OrderDetailDrawer, DetailOrder } from '@/components/admin/OrderDetailDrawer'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Users,
  ShoppingCart,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Wallet,
  Loader2,
  Plus,
  Package,
  BarChart3,
  Crown,
  Zap,
  Activity,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react'
import { useState, useMemo } from 'react'

interface DashboardStats {
  totalUsers: number
  totalOrders: number
  revenueToday: number
  pendingOrders: number
  completedToday: number
  failedOrders: number
  revenueThisMonth: number
  walletBalance: number
  totalServices: number
  totalSuppliers: number
  processingOrders: number
  completedOrders: number
  rejectedOrders: number
  refundedOrders: number
  totalProfit: number
  todaySpending: number
  recentOrders: DashboardOrder[]
}

interface DashboardOrder {
  id: string
  orderNumber: string
  status: string
  priority: string
  sellingPrice: number
  createdAt: string
  completedAt: string | null
  imei?: string | null
  deviceInfo?: string | null
  serviceName?: string
  serviceType?: string
  userName?: string
}

interface SupplierItem {
  id: string
  name: string
  status: string
}

interface CustomerAgg {
  name: string
  orders: number
  totalSpent: number
}

interface ServiceAgg {
  name: string
  orders: number
  totalRevenue: number
}

interface DayRevenue {
  label: string
  shortLabel: string
  revenue: number
}

const container = { animate: { transition: { staggerChildren: 0.06 } } }
const item = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
}

function statusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle size={14} className="text-emerald-500" />
    case 'processing':
      return <RefreshCw size={14} className="text-blue-500 animate-spin" />
    case 'pending':
      return <Clock size={14} className="text-amber-500" />
    case 'failed':
    case 'rejected':
      return <XCircle size={14} className="text-red-500" />
    default:
      return <Activity size={14} className="text-[var(--muted)]" />
  }
}

function computeDailyRevenue(orders: DashboardOrder[]): DayRevenue[] {
  const days: DayRevenue[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' })
    const shortStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const revenue = orders
      .filter((o) => {
        if (o.status !== 'completed' || !o.completedAt) return false
        const t = new Date(o.completedAt).getTime()
        return t >= d.getTime() && t < next.getTime()
      })
      .reduce((sum, o) => sum + (o.sellingPrice || 0), 0)
    days.push({ label: `${dayStr} (${shortStr})`, shortLabel: dayStr, revenue: Math.round(revenue * 100) / 100 })
  }
  return days
}

function computeTopCustomers(orders: DashboardOrder[]): CustomerAgg[] {
  const map = new Map<string, CustomerAgg>()
  for (const o of orders) {
    const name = o.userName || 'Unknown'
    const existing = map.get(name)
    if (existing) {
      existing.orders++
      existing.totalSpent += o.sellingPrice || 0
    } else {
      map.set(name, { name, orders: 1, totalSpent: o.sellingPrice || 0 })
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5)
}

function computeTopServices(orders: DashboardOrder[]): ServiceAgg[] {
  const map = new Map<string, ServiceAgg>()
  for (const o of orders) {
    const name = o.serviceName || 'Unknown Service'
    const existing = map.get(name)
    if (existing) {
      existing.orders++
      existing.totalRevenue += o.sellingPrice || 0
    } else {
      map.set(name, { name, orders: 1, totalRevenue: o.sellingPrice || 0 })
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5)
}

export default function AdminDashboard() {
  const { toast } = useToast()
  const { data: stats, loading: statsLoading, error: statsError } = useApi<DashboardStats>({ url: '/api/dashboard' })
  const { data: suppliersRes } = useApi<{ suppliers: SupplierItem[] }>({ url: '/api/suppliers' })

  const [viewOrder, setViewOrder] = useState<DetailOrder | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const s = stats || {
    totalUsers: 0, totalOrders: 0, revenueToday: 0, pendingOrders: 0,
    completedToday: 0, failedOrders: 0, revenueThisMonth: 0, walletBalance: 0,
    totalServices: 0, totalSuppliers: 0, processingOrders: 0, completedOrders: 0,
    rejectedOrders: 0, refundedOrders: 0, totalProfit: 0, todaySpending: 0,
    recentOrders: [],
  }

  const recentOrders = useMemo(() => stats?.recentOrders || [], [stats])
  const dailyRevenue = useMemo(() => computeDailyRevenue(recentOrders), [recentOrders])
  const topCustomers = useMemo(() => computeTopCustomers(recentOrders), [recentOrders])
  const topServices = useMemo(() => computeTopServices(recentOrders), [recentOrders])
  const maxDailyRevenue = useMemo(() => Math.max(...dailyRevenue.map((d) => d.revenue), 1), [dailyRevenue])

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

  if (statsLoading) {
    return (
      <div>
        <Header title="Dashboard" subtitle="Welcome back, Admin" />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonStat key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SkeletonCard className="lg:col-span-2 h-72" />
            <SkeletonCard className="h-72" />
          </div>
        </div>
      </div>
    )
  }

  if (statsError) {
    return (
      <div>
        <Header title="Dashboard" subtitle="Welcome back, Admin" />
        <div className="p-6 flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-red-400 text-sm">{statsError}</p>
          <Link href="/login" className="text-[var(--accent)] text-sm hover:underline">Go to Login</Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Dashboard" subtitle="Welcome back, Admin" />
      <div className="p-6 space-y-6">
        {/* Row 1: Stat Cards */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          variants={container}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={item}>
            <Link href="/admin/users">
              <StatCard title="Total Users" value={s.totalUsers} icon={Users} color="blue" />
            </Link>
          </motion.div>
          <motion.div variants={item}>
            <Link href="/admin/orders">
              <StatCard title="Total Orders" value={s.totalOrders.toLocaleString()} icon={ShoppingCart} color="purple" />
            </Link>
          </motion.div>
          <motion.div variants={item}>
            <StatCard title="Revenue Today" value={`$${s.revenueToday.toLocaleString()}`} icon={DollarSign} color="green" />
          </motion.div>
          <motion.div variants={item}>
            <Link href="/admin/orders">
              <StatCard title="Pending Orders" value={s.pendingOrders} icon={Clock} color="amber" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Row 2: Stat Cards */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          variants={container}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={item}>
            <StatCard title="Completed Today" value={s.completedToday} icon={CheckCircle} color="green" />
          </motion.div>
          <motion.div variants={item}>
            <StatCard title="Failed Orders" value={s.failedOrders} icon={XCircle} color="red" />
          </motion.div>
          <motion.div variants={item}>
            <StatCard title="Monthly Revenue" value={`$${s.revenueThisMonth.toLocaleString()}`} icon={TrendingUp} color="indigo" />
          </motion.div>
          <motion.div variants={item}>
            <StatCard title="Wallet Balance" value={`$${s.walletBalance.toLocaleString()}`} icon={Wallet} color="pink" />
          </motion.div>
        </motion.div>

        {/* Revenue Trend Chart + Quick Stats Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Trend Chart */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlassCard padding="p-0">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 size={18} className="text-[var(--accent)]" />
                  <h3 className="text-lg font-bold text-[var(--foreground)]">Revenue Trend (7 Days)</h3>
                </div>
                <span className="text-xs text-[var(--muted)]">Completed orders</span>
              </div>
              <div className="px-5 pb-5">
                <div className="flex items-end gap-2 h-48">
                  {dailyRevenue.map((day, i) => {
                    const heightPct = maxDailyRevenue > 0 ? (day.revenue / maxDailyRevenue) * 100 : 0
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        <span className="text-[10px] font-medium text-[var(--muted)] truncate max-w-full">
                          {day.revenue > 0 ? `$${day.revenue.toLocaleString()}` : '—'}
                        </span>
                        <motion.div
                          className="w-full rounded-t-lg bg-gradient-to-t from-[var(--accent)] to-[var(--accent-light, var(--accent))] opacity-80 hover:opacity-100 transition-opacity cursor-pointer min-h-[2px]"
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(heightPct, 2)}%` }}
                          transition={{ delay: 0.4 + i * 0.05, duration: 0.5, ease: 'easeOut' }}
                          title={`${day.label}: $${day.revenue.toLocaleString()}`}
                        />
                        <span className="text-[10px] text-[var(--muted)] font-medium">{day.shortLabel}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Quick Stats Sidebar */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <GlassCard>
              <h3 className="text-lg font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
                <Zap size={16} className="text-[var(--accent)]" />
                Quick Stats
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <CheckCircle size={16} className="text-emerald-500" /> Completed Today
                  </div>
                  <span className="text-sm font-bold text-[var(--foreground)]">{s.completedToday}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <XCircle size={16} className="text-red-500" /> Failed Orders
                  </div>
                  <span className="text-sm font-bold text-[var(--foreground)]">{s.failedOrders}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <RefreshCw size={16} className="text-blue-500" /> Processing
                  </div>
                  <span className="text-sm font-bold text-[var(--foreground)]">{s.processingOrders}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <TrendingUp size={16} className="text-indigo-500" /> Monthly Revenue
                  </div>
                  <span className="text-sm font-bold text-[var(--foreground)]">${s.revenueThisMonth.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <DollarSign size={16} className="text-emerald-500" /> Total Profit
                  </div>
                  <span className="text-sm font-bold text-[var(--foreground)]">${s.totalProfit.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <Wallet size={16} className="text-purple-500" /> Wallet Balance
                  </div>
                  <span className="text-sm font-bold text-[var(--foreground)]">${s.walletBalance.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <Package size={16} className="text-pink-500" /> Active Services
                  </div>
                  <span className="text-sm font-bold text-[var(--foreground)]">{s.totalServices}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <Users size={16} className="text-blue-500" /> Total Users
                  </div>
                  <span className="text-sm font-bold text-[var(--foreground)]">{s.totalUsers}</span>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-lg font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
                <Activity size={16} className="text-[var(--accent)]" />
                Suppliers
              </h3>
              <div className="space-y-2">
                {(suppliersRes?.suppliers || []).length === 0 && (
                  <p className="text-sm text-[var(--muted)]">No suppliers configured</p>
                )}
                {(suppliersRes?.suppliers || []).slice(0, 5).map((supplier: SupplierItem) => (
                  <div key={supplier.id} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--muted)]">{supplier.name}</span>
                    <span className={`flex items-center gap-1.5 ${supplier.status === 'active' ? 'text-emerald-500' : 'text-red-500'}`}>
                      <span className={`w-2 h-2 rounded-full ${supplier.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      {supplier.status === 'active' ? 'Online' : 'Offline'}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Top Customers + Top Services + Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top 5 Customers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Crown size={16} className="text-amber-500" />
                  <h3 className="text-lg font-bold text-[var(--foreground)]">Top Customers</h3>
                </div>
                <Link href="/admin/users" className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
                  View all <ArrowUpRight size={12} />
                </Link>
              </div>
              <div className="space-y-3">
                {topCustomers.length === 0 && (
                  <p className="text-sm text-[var(--muted)] text-center py-4">No customer data yet</p>
                )}
                {topCustomers.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-light, var(--accent))] flex items-center justify-center text-xs font-bold text-[var(--background)] shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">{c.name}</p>
                      <p className="text-xs text-[var(--muted)]">{c.orders} order{c.orders !== 1 ? 's' : ''}</p>
                    </div>
                    <span className="text-sm font-bold text-[var(--foreground)] whitespace-nowrap">${c.totalSpent.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Top 5 Services */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
          >
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-500" />
                  <h3 className="text-lg font-bold text-[var(--foreground)]">Top Services</h3>
                </div>
                <Link href="/admin/services" className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
                  View all <ArrowUpRight size={12} />
                </Link>
              </div>
              <div className="space-y-3">
                {topServices.length === 0 && (
                  <p className="text-sm text-[var(--muted)] text-center py-4">No service data yet</p>
                )}
                {topServices.map((svc, i) => {
                  const maxRev = topServices[0]?.totalRevenue || 1
                  const barPct = Math.round((svc.totalRevenue / maxRev) * 100)
                  return (
                    <div key={svc.name} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 text-xs font-bold text-[var(--muted)] shrink-0">#{i + 1}</span>
                          <span className="text-sm font-medium text-[var(--foreground)] truncate">{svc.name}</span>
                        </div>
                        <span className="text-xs font-bold text-[var(--foreground)] whitespace-nowrap">${svc.totalRevenue.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light, var(--accent))]"
                            initial={{ width: 0 }}
                            animate={{ width: `${barPct}%` }}
                            transition={{ delay: 0.6 + i * 0.05, duration: 0.4 }}
                          />
                        </div>
                        <span className="text-[10px] text-[var(--muted)] w-12 text-right shrink-0">{svc.orders} ord.</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </GlassCard>
          </motion.div>

          {/* Recent Activity Feed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-emerald-500" />
                  <h3 className="text-lg font-bold text-[var(--foreground)]">Activity Feed</h3>
                </div>
                <Link href="/admin/orders" className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
                  View all <ArrowUpRight size={12} />
                </Link>
              </div>
              <div className="relative">
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-[var(--card-border)]" />
                <div className="space-y-0">
                  {recentOrders.slice(0, 10).map((order) => (
                    <div
                      key={order.id}
                      className="relative flex items-start gap-3 py-2.5 px-1 cursor-pointer hover:bg-white/5 rounded-lg transition-colors"
                      onClick={() => loadDetail(order.id)}
                    >
                      <div className="relative z-10 mt-0.5 shrink-0 w-7 h-7 rounded-full bg-[var(--card-bg)] flex items-center justify-center border border-[var(--card-border)]">
                        {statusIcon(order.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-medium text-[var(--foreground)]">{order.orderNumber}</span>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="text-xs text-[var(--muted)] truncate mt-0.5">
                          {order.userName || 'Unknown'} &middot; {order.serviceName || 'Service'}
                        </p>
                      </div>
                      <span className="text-[10px] text-[var(--muted)] whitespace-nowrap shrink-0 mt-0.5">{timeAgo(order.createdAt)}</span>
                    </div>
                  ))}
                  {recentOrders.length === 0 && (
                    <p className="text-sm text-[var(--muted)] text-center py-6">No activity yet</p>
                  )}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Recent Orders Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          <GlassCard padding="p-0">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-[var(--accent)]" />
                <h3 className="text-lg font-bold text-[var(--foreground)]">Recent Orders</h3>
              </div>
              <Link href="/admin/orders" className="text-sm text-[var(--accent)] hover:underline">View all</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--card-border)]">
                    <th className="text-left py-3 px-5 text-[var(--muted)] font-medium">Order</th>
                    <th className="text-left py-3 px-2 text-[var(--muted)] font-medium">User</th>
                    <th className="text-left py-3 px-2 text-[var(--muted)] font-medium">Service</th>
                    <th className="text-left py-3 px-2 text-[var(--muted)] font-medium">IMEI/SN</th>
                    <th className="text-left py-3 px-2 text-[var(--muted)] font-medium">Status</th>
                    <th className="text-right py-3 px-2 text-[var(--muted)] font-medium">Price</th>
                    <th className="text-left py-3 px-2 text-[var(--muted)] font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order: DashboardOrder) => (
                    <tr
                      key={order.id}
                      className="border-b border-[var(--card-border)] hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => loadDetail(order.id)}
                    >
                      <td className="py-3 px-5 font-mono font-medium text-[var(--foreground)]">{order.orderNumber}</td>
                      <td className="py-3 px-2 text-[var(--foreground)]">{order.userName || 'N/A'}</td>
                      <td className="py-3 px-2 text-[var(--foreground)]">{order.serviceName || 'N/A'}</td>
                      <td className="py-3 px-2 font-mono text-xs text-[var(--muted)] max-w-[120px] truncate">{order.imei || order.deviceInfo || '—'}</td>
                      <td className="py-3 px-2"><StatusBadge status={order.status} /></td>
                      <td className="py-3 px-2 text-right font-medium text-[var(--foreground)]">${(order.sellingPrice || 0).toFixed(2)}</td>
                      <td className="py-3 px-2 text-xs text-[var(--muted)]">{timeAgo(order.createdAt)}</td>
                    </tr>
                  ))}
                  {recentOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[var(--muted)]">No orders yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Link href="/admin/orders">
            <GlassCard padding="p-5" className="cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                  <Plus size={20} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-[var(--foreground)]">New Order</p>
                  <p className="text-xs text-[var(--muted)]">Create a service order</p>
                </div>
              </div>
            </GlassCard>
          </Link>
          <Link href="/admin/services">
            <GlassCard padding="p-5" className="cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
                  <Package size={20} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-[var(--foreground)]">Add Service</p>
                  <p className="text-xs text-[var(--muted)]">Create a new service</p>
                </div>
              </div>
            </GlassCard>
          </Link>
          <Link href="/admin/users">
            <GlassCard padding="p-5" className="cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                  <Users size={20} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-[var(--foreground)]">Add User</p>
                  <p className="text-xs text-[var(--muted)]">Create a new user</p>
                </div>
              </div>
            </GlassCard>
          </Link>
        </motion.div>
      </div>

      <OrderDetailDrawer
        open={!!viewOrder}
        onClose={() => setViewOrder(null)}
        order={viewOrder}
        loading={detailLoading}
        adminUsers={[]}
        onUpdate={() => { if (viewOrder) loadDetail(viewOrder.id) }}
      />
    </div>
  )
}
