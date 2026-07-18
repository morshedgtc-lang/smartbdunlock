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
  Users, ShoppingCart, DollarSign, Clock, CheckCircle, XCircle,
  TrendingUp, Wallet, Package, BarChart3, Crown, Zap, Activity,
  ArrowUpRight, RefreshCw, RotateCcw,
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

const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }

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
    case 'completed': return <CheckCircle size={13} className="text-emerald-500" />
    case 'processing': return <RefreshCw size={13} className="text-blue-500 animate-spin" />
    case 'pending': return <Clock size={13} className="text-amber-500" />
    case 'failed': case 'rejected': return <XCircle size={13} className="text-red-500" />
    default: return <Activity size={13} className="text-[var(--muted)]" />
  }
}

function computeDailyRevenue(orders: DashboardOrder[]): DayRevenue[] {
  const days: DayRevenue[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0)
    const next = new Date(d); next.setDate(next.getDate() + 1)
    const revenue = orders
      .filter((o) => {
        if (o.status !== 'completed' || !o.completedAt) return false
        const t = new Date(o.completedAt).getTime()
        return t >= d.getTime() && t < next.getTime()
      })
      .reduce((sum, o) => sum + (o.sellingPrice || 0), 0)
    days.push({
      label: `${d.toLocaleDateString('en-US', { weekday: 'short' })} (${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`,
      shortLabel: d.toLocaleDateString('en-US', { weekday: 'short' }),
      revenue: Math.round(revenue * 100) / 100,
    })
  }
  return days
}

function computeTopCustomers(orders: DashboardOrder[]): CustomerAgg[] {
  const map = new Map<string, CustomerAgg>()
  for (const o of orders) {
    const name = o.userName || 'Unknown'
    const e = map.get(name)
    if (e) { e.orders++; e.totalSpent += o.sellingPrice || 0 }
    else map.set(name, { name, orders: 1, totalSpent: o.sellingPrice || 0 })
  }
  return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5)
}

function computeTopServices(orders: DashboardOrder[]): ServiceAgg[] {
  const map = new Map<string, ServiceAgg>()
  for (const o of orders) {
    const name = o.serviceName || 'Unknown Service'
    const e = map.get(name)
    if (e) { e.orders++; e.totalRevenue += o.sellingPrice || 0 }
    else map.set(name, { name, orders: 1, totalRevenue: o.sellingPrice || 0 })
  }
  return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5)
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
    } catch { toast('error', 'Failed to load order') }
    finally { setDetailLoading(false) }
  }

  if (statsLoading) {
    return (
      <div>
        <Header title="Dashboard" subtitle="Welcome back, Admin" />
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SkeletonCard className="lg:col-span-2 h-64" />
            <SkeletonCard className="h-64" />
          </div>
        </div>
      </div>
    )
  }

  if (statsError) {
    return (
      <div>
        <Header title="Dashboard" subtitle="Welcome back, Admin" />
        <div className="p-4 flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-red-400 text-sm">{statsError}</p>
          <Link href="/login" className="text-[var(--accent)] text-sm hover:underline">Go to Login</Link>
        </div>
      </div>
    )
  }

  const orderStatusData = [
    { label: 'Pending', count: s.pendingOrders, color: 'bg-amber-500', text: 'text-amber-500', icon: Clock },
    { label: 'Processing', count: s.processingOrders, color: 'bg-blue-500', text: 'text-blue-500', icon: RefreshCw },
    { label: 'Completed', count: s.completedToday, color: 'bg-emerald-500', text: 'text-emerald-500', icon: CheckCircle },
    { label: 'Failed', count: s.failedOrders, color: 'bg-red-500', text: 'text-red-500', icon: XCircle },
    { label: 'Rejected', count: s.rejectedOrders, color: 'bg-red-600', text: 'text-red-600', icon: XCircle },
    { label: 'Refunded', count: s.refundedOrders, color: 'bg-purple-500', text: 'text-purple-500', icon: RotateCcw },
  ]

  return (
    <div>
      <Header title="Dashboard" subtitle="Welcome back, Admin" />
      <div className="p-4 space-y-4">

        {/* Row 1: 4 Key Metrics */}
        <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-3" {...fadeUp}>
          <Link href="/admin/orders">
            <StatCard title="Revenue Today" value={`$${s.revenueToday.toLocaleString()}`} icon={DollarSign} color="green" />
          </Link>
          <Link href="/admin/orders">
            <StatCard title="Pending Orders" value={s.pendingOrders} icon={Clock} color="amber" />
          </Link>
          <Link href="/admin/orders">
            <StatCard title="Completed Today" value={s.completedToday} icon={CheckCircle} color="blue" />
          </Link>
          <Link href="/admin/users">
            <StatCard title="Total Users" value={s.totalUsers} icon={Users} color="purple" />
          </Link>
        </motion.div>

        {/* Row 2: 4 Secondary Metrics */}
        <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-3" {...fadeUp} transition={{ delay: 0.05 }}>
          <StatCard title="Total Orders" value={s.totalOrders.toLocaleString()} icon={ShoppingCart} color="indigo" />
          <StatCard title="Monthly Revenue" value={`$${s.revenueThisMonth.toLocaleString()}`} icon={TrendingUp} color="indigo" />
          <StatCard title="Profit" value={`$${s.totalProfit.toLocaleString()}`} icon={Zap} color="green" />
          <Link href="/admin/wallet">
            <StatCard title="Wallet Balance" value={`$${s.walletBalance.toLocaleString()}`} icon={Wallet} color="pink" />
          </Link>
        </motion.div>

        {/* Row 3: Revenue Chart + Order Status Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue Chart */}
          <motion.div className="lg:col-span-2" {...fadeUp} transition={{ delay: 0.1 }}>
            <GlassCard padding="p-0" className="h-full">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-[var(--accent)]" />
                  <h3 className="text-sm font-bold text-[var(--foreground)]">Revenue Trend (7 Days)</h3>
                </div>
                <span className="text-[10px] text-[var(--muted)]">Completed orders</span>
              </div>
              <div className="px-4 pb-4">
                <div className="flex items-end gap-1.5 h-40">
                  {dailyRevenue.map((day, i) => {
                    const heightPct = maxDailyRevenue > 0 ? (day.revenue / maxDailyRevenue) * 100 : 0
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        <span className="text-[10px] font-medium text-[var(--muted)] truncate max-w-full">
                          {day.revenue > 0 ? `$${day.revenue.toLocaleString()}` : '—'}
                        </span>
                        <motion.div
                          className="w-full rounded-t-md bg-gradient-to-t from-[var(--accent)] to-[var(--accent-light, var(--accent))] opacity-80 hover:opacity-100 transition-opacity cursor-pointer min-h-[2px]"
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(heightPct, 2)}%` }}
                          transition={{ delay: 0.2 + i * 0.04, duration: 0.4, ease: 'easeOut' }}
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

          {/* Order Status Breakdown */}
          <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
            <GlassCard className="h-full">
              <div className="flex items-center gap-2 mb-3">
                <Activity size={16} className="text-[var(--accent)]" />
                <h3 className="text-sm font-bold text-[var(--foreground)]">Order Status</h3>
              </div>
              <div className="space-y-2.5">
                {orderStatusData.map((st) => {
                  const total = s.totalOrders || 1
                  const pct = Math.round((st.count / total) * 100)
                  return (
                    <div key={st.label} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${st.color}`} />
                          <span className="text-xs text-[var(--muted)]">{st.label}</span>
                        </div>
                        <span className="text-xs font-bold text-[var(--foreground)]">{st.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${st.color}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.3, duration: 0.5 }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-[var(--card-border)]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--muted)]">Success Rate</span>
                  <span className="font-bold text-emerald-500">
                    {s.totalOrders > 0 ? Math.round(((s.completedOrders || 0) / s.totalOrders) * 100) : 0}%
                  </span>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Row 4: Recent Orders (left 2/3) + Top Customers (right 1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Orders Table */}
          <motion.div className="lg:col-span-2" {...fadeUp} transition={{ delay: 0.2 }}>
            <GlassCard padding="p-0" className="h-full">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={16} className="text-[var(--accent)]" />
                  <h3 className="text-sm font-bold text-[var(--foreground)]">Recent Orders</h3>
                </div>
                <Link href="/admin/orders" className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
                  View all <ArrowUpRight size={11} />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--card-border)]">
                      <th className="text-left py-2.5 px-4 text-[var(--muted)] font-medium text-xs">Order</th>
                      <th className="text-left py-2.5 px-2 text-[var(--muted)] font-medium text-xs">User</th>
                      <th className="text-left py-2.5 px-2 text-[var(--muted)] font-medium text-xs">Service</th>
                      <th className="text-left py-2.5 px-2 text-[var(--muted)] font-medium text-xs">Status</th>
                      <th className="text-right py-2.5 px-2 text-[var(--muted)] font-medium text-xs">Price</th>
                      <th className="text-left py-2.5 px-4 text-[var(--muted)] font-medium text-xs">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.slice(0, 8).map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-[var(--card-border)] hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => loadDetail(order.id)}
                      >
                        <td className="py-2.5 px-4 font-mono font-medium text-[var(--foreground)] text-xs">{order.orderNumber}</td>
                        <td className="py-2.5 px-2 text-[var(--foreground)] text-xs truncate max-w-[100px]">{order.userName || 'N/A'}</td>
                        <td className="py-2.5 px-2 text-[var(--foreground)] text-xs truncate max-w-[120px]">{order.serviceName || 'N/A'}</td>
                        <td className="py-2.5 px-2"><StatusBadge status={order.status} /></td>
                        <td className="py-2.5 px-2 text-right font-medium text-[var(--foreground)] text-xs">${(order.sellingPrice || 0).toFixed(2)}</td>
                        <td className="py-2.5 px-4 text-xs text-[var(--muted)] whitespace-nowrap">{timeAgo(order.createdAt)}</td>
                      </tr>
                    ))}
                    {recentOrders.length === 0 && (
                      <tr><td colSpan={6} className="py-8 text-center text-[var(--muted)] text-xs">No orders yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </motion.div>

          {/* Top Customers */}
          <motion.div {...fadeUp} transition={{ delay: 0.25 }}>
            <GlassCard className="h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Crown size={16} className="text-amber-500" />
                  <h3 className="text-sm font-bold text-[var(--foreground)]">Top Customers</h3>
                </div>
                <Link href="/admin/users" className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
                  View all <ArrowUpRight size={11} />
                </Link>
              </div>
              <div className="space-y-2.5">
                {topCustomers.length === 0 && (
                  <p className="text-xs text-[var(--muted)] text-center py-4">No customer data yet</p>
                )}
                {topCustomers.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-light, var(--accent))] flex items-center justify-center text-[10px] font-bold text-[var(--background)] shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--foreground)] truncate">{c.name}</p>
                      <p className="text-[10px] text-[var(--muted)]">{c.orders} order{c.orders !== 1 ? 's' : ''}</p>
                    </div>
                    <span className="text-xs font-bold text-[var(--foreground)] whitespace-nowrap">${c.totalSpent.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Row 5: Top Services + Activity Feed + Suppliers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Top Services */}
          <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
            <GlassCard className="h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-500" />
                  <h3 className="text-sm font-bold text-[var(--foreground)]">Top Services</h3>
                </div>
                <Link href="/admin/services" className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
                  View all <ArrowUpRight size={11} />
                </Link>
              </div>
              <div className="space-y-2.5">
                {topServices.length === 0 && (
                  <p className="text-xs text-[var(--muted)] text-center py-4">No service data yet</p>
                )}
                {topServices.map((svc, i) => {
                  const maxRev = topServices[0]?.totalRevenue || 1
                  const barPct = Math.round((svc.totalRevenue / maxRev) * 100)
                  return (
                    <div key={svc.name} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-4 text-[10px] font-bold text-[var(--muted)] shrink-0">#{i + 1}</span>
                          <span className="text-xs font-medium text-[var(--foreground)] truncate">{svc.name}</span>
                        </div>
                        <span className="text-[10px] font-bold text-[var(--foreground)] whitespace-nowrap">${svc.totalRevenue.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light, var(--accent))]"
                            initial={{ width: 0 }}
                            animate={{ width: `${barPct}%` }}
                            transition={{ delay: 0.4 + i * 0.04, duration: 0.4 }}
                          />
                        </div>
                        <span className="text-[10px] text-[var(--muted)] w-10 text-right shrink-0">{svc.orders} ord.</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </GlassCard>
          </motion.div>

          {/* Activity Feed */}
          <motion.div {...fadeUp} transition={{ delay: 0.35 }}>
            <GlassCard className="h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-emerald-500" />
                  <h3 className="text-sm font-bold text-[var(--foreground)]">Activity Feed</h3>
                </div>
                <Link href="/admin/orders" className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
                  View all <ArrowUpRight size={11} />
                </Link>
              </div>
              <div className="relative">
                <div className="absolute left-[13px] top-2 bottom-2 w-px bg-[var(--card-border)]" />
                <div className="space-y-0 max-h-[280px] overflow-y-auto">
                  {recentOrders.slice(0, 10).map((order) => (
                    <div
                      key={order.id}
                      className="relative flex items-start gap-2.5 py-2 px-1 cursor-pointer hover:bg-white/5 rounded-lg transition-colors"
                      onClick={() => loadDetail(order.id)}
                    >
                      <div className="relative z-10 mt-0.5 shrink-0 w-6 h-6 rounded-full bg-[var(--card-bg)] flex items-center justify-center border border-[var(--card-border)]">
                        {statusIcon(order.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono font-medium text-[var(--foreground)]">{order.orderNumber}</span>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="text-[10px] text-[var(--muted)] truncate mt-0.5">
                          {order.userName || 'Unknown'} &middot; {order.serviceName || 'Service'}
                        </p>
                      </div>
                      <span className="text-[10px] text-[var(--muted)] whitespace-nowrap shrink-0 mt-0.5">{timeAgo(order.createdAt)}</span>
                    </div>
                  ))}
                  {recentOrders.length === 0 && (
                    <p className="text-xs text-[var(--muted)] text-center py-6">No activity yet</p>
                  )}
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Suppliers + Quick Actions */}
          <motion.div className="space-y-4" {...fadeUp} transition={{ delay: 0.4 }}>
            <GlassCard>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-[var(--accent)]" />
                  <h3 className="text-sm font-bold text-[var(--foreground)]">Suppliers</h3>
                </div>
                <Link href="/admin/suppliers" className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
                  Manage <ArrowUpRight size={11} />
                </Link>
              </div>
              <div className="space-y-2">
                {(suppliersRes?.suppliers || []).length === 0 && (
                  <p className="text-xs text-[var(--muted)]">No suppliers configured</p>
                )}
                {(suppliersRes?.suppliers || []).slice(0, 4).map((supplier: SupplierItem) => (
                  <div key={supplier.id} className="flex items-center justify-between">
                    <span className="text-xs text-[var(--foreground)]">{supplier.name}</span>
                    <span className={`flex items-center gap-1.5 text-xs ${supplier.status === 'active' ? 'text-emerald-500' : 'text-red-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${supplier.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      {supplier.status === 'active' ? 'Online' : 'Offline'}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Quick Actions */}
            <GlassCard padding="p-3">
              <div className="grid grid-cols-2 gap-2">
                <Link href="/admin/orders" className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/8 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                    <Zap size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--foreground)]">New Order</p>
                    <p className="text-[9px] text-[var(--muted)]">Create order</p>
                  </div>
                </Link>
                <Link href="/admin/services" className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/8 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
                    <Package size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--foreground)]">Services</p>
                    <p className="text-[9px] text-[var(--muted)]">Manage</p>
                  </div>
                </Link>
                <Link href="/admin/users" className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/8 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                    <Users size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--foreground)]">Users</p>
                    <p className="text-[9px] text-[var(--muted)]">Manage</p>
                  </div>
                </Link>
                <Link href="/admin/deposit-requests" className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/8 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
                    <DollarSign size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--foreground)]">Deposits</p>
                    <p className="text-[9px] text-[var(--muted)]">Review</p>
                  </div>
                </Link>
              </div>
            </GlassCard>
          </motion.div>
        </div>
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
