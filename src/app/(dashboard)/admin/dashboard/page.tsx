'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SkeletonStat, SkeletonCard } from '@/components/ui/Skeleton'
import { OrderDetailDrawer, DetailOrder } from '@/components/admin/OrderDetailDrawer'
import { useApi } from '@/hooks/useApi'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/lib/api'
import { timeAgo } from '@/lib/utils'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useState, useMemo } from 'react'
import {
  Users, ShoppingCart, DollarSign, Clock, CheckCircle, XCircle,
  TrendingUp, Wallet, Package, BarChart3, Crown, Activity,
  ArrowUpRight, RefreshCw, AlertTriangle, Server,
  Database, Wifi, Bell, Eye, Reply, Settings,
  MessageSquare, UserPlus, CreditCard, Radio,
  Globe, HardDrive, Layers, Play, Plus,
} from 'lucide-react'

interface DashboardData {
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
  customValues?: { value?: string | null; label?: string; fieldType?: string }[]
}

interface ReportingData {
  summary: {
    revenue: number
    profit: number
    totalOrders: number
    completedOrders: number
    pendingOrders: number
    failedOrders: number
    cancelledOrders: number
    activeUsers: number
    totalUsers: number
    activeServices: number
    totalSuppliers: number
    avgOrderValue: number
    conversionRate: string
  }
  dailyRevenue: { date: string; revenue: number; orders: number }[]
  topServices: { name: string; orders: number; revenue: number; profit: number }[]
  topUsers: { name: string; email: string; orders: number; spent: number }[]
  statusDistribution: { status: string; count: number }[]
}

interface OrderSummary {
  total: number
  counts: { pending: number; processing: number; completed: number; failed: number; cancelled: number; rejected: number; refunded: number }
  todayRevenue: number
}

interface OrdersData {
  orders: {
    id: string; orderNumber: string; status: string; priority: string;
    imei?: string | null; deviceInfo?: string | null; sellingPrice: number;
    createdAt: string; serviceName?: string; serviceType?: string;
    userName?: string; userEmail?: string; supplierName?: string;
  }[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

interface NotificationItem {
  id: string; title: string; message: string; type: string; read: boolean; link?: string; createdAt: string
}

interface NotificationData {
  notifications: NotificationItem[]
  unreadCount: number
}

interface DepositRequest {
  id: string; userId: string; amount: number; method: string; status: string;
  createdAt: string; userName?: string; userEmail?: string; userPublicId?: string
}

interface DepositData {
  requests: DepositRequest[]
  pagination: { total: number }
}

interface SupplierItem {
  id: string; name: string; status: string; type: string; successRate: number;
  totalOrders: number; priority: number; orderCount?: number; serviceCount?: number
}

interface AuditLog {
  id: string; userId?: string | null; userEmail?: string | null; action: string;
  entityType: string; entityId?: string | null; description?: string | null;
  module?: string | null; createdAt: string
}

const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }

function resolveOrderImei(order: { imei?: string | null; deviceInfo?: string | null; customValues?: { value?: string | null; label?: string; fieldType?: string }[] }): string {
  if (order.imei || order.deviceInfo) return order.imei || order.deviceInfo || ''
  const cv = (order.customValues || []).find(
    (v) => v.fieldType === 'imei_single' || (v.label || '').toLowerCase().includes('imei'),
  )
  return cv?.value || '—'
}

function auditActionLabel(action: string): { label: string; color: string } {
  if (action.includes('order.create') || action.includes('order.place')) return { label: 'New Order', color: 'text-blue-500 bg-blue-500/10' }
  if (action.includes('order.update') || action.includes('order.status')) return { label: 'Order Updated', color: 'text-amber-500 bg-amber-500/10' }
  if (action.includes('wallet.deposit') || action.includes('deposit.approve')) return { label: 'Deposit', color: 'text-emerald-500 bg-emerald-500/10' }
  if (action.includes('wallet.transfer')) return { label: 'Transfer', color: 'text-purple-500 bg-purple-500/10' }
  if (action.includes('wallet.withdraw')) return { label: 'Withdrawal', color: 'text-red-500 bg-red-500/10' }
  if (action.includes('user.create')) return { label: 'User Created', color: 'text-cyan-500 bg-cyan-500/10' }
  if (action.includes('user.delete')) return { label: 'User Deleted', color: 'text-red-500 bg-red-500/10' }
  if (action.includes('service')) return { label: 'Service Change', color: 'text-indigo-500 bg-indigo-500/10' }
  if (action.includes('supplier')) return { label: 'Supplier Action', color: 'text-pink-500 bg-pink-500/10' }
  return { label: 'Activity', color: 'text-[var(--muted)] bg-white/5' }
}

const QUICK_ACTIONS = [
  { label: 'Create Order', href: '/admin/orders', icon: ShoppingCart, gradient: 'from-indigo-500 to-blue-500' },
  { label: 'Add Service', href: '/admin/services', icon: Package, gradient: 'from-purple-500 to-pink-500' },
  { label: 'Create User', href: '/admin/users', icon: UserPlus, gradient: 'from-emerald-500 to-teal-500' },
  { label: 'Deposits', href: '/admin/deposit-requests', icon: CreditCard, gradient: 'from-amber-500 to-orange-500' },
  { label: 'Wallet', href: '/admin/wallet', icon: Wallet, gradient: 'from-cyan-500 to-blue-500' },
  { label: 'Suppliers', href: '/admin/suppliers', icon: Globe, gradient: 'from-pink-500 to-rose-500' },
  { label: 'Reports', href: '/admin/reporting', icon: BarChart3, gradient: 'from-violet-500 to-purple-500' },
  { label: 'Settings', href: '/admin/settings', icon: Settings, gradient: 'from-slate-500 to-gray-500' },
]

export default function AdminDashboard() {
  const { toast } = useToast()
  useAuth()
  const { data: dash, loading: dashLoading, error: dashError } = useApi<DashboardData>({ url: '/api/dashboard' })
  const { data: report } = useApi<ReportingData>({ url: '/api/reporting?range=30d' })
  const { data: summary } = useApi<OrderSummary>({ url: '/api/orders/summary' })
  const { data: ordersRes } = useApi<OrdersData>({ url: '/api/orders?limit=10' })
  const { data: notifRes } = useApi<NotificationData>({ url: '/api/notifications?limit=15' })
  const { data: depositsRes } = useApi<DepositData>({ url: '/api/deposit-requests?status=pending&limit=5' })
  const { data: suppliersRes } = useApi<{ suppliers: SupplierItem[] }>({ url: '/api/suppliers' })
  const { data: auditRes } = useApi<{ logs: AuditLog[] }>({ url: '/api/audit-logs?limit=12' })

  const [viewOrder, setViewOrder] = useState<DetailOrder | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const s = dash
  const r = report
  const sc = summary
  const orders = ordersRes?.orders || []
  const notifications = notifRes?.notifications || []
  const unreadCount = notifRes?.unreadCount || 0
  const pendingDepositCount = depositsRes?.pagination?.total || 0
  const suppliers = suppliersRes?.suppliers || []
  const auditLogs = auditRes?.logs || []

  const dailyRevenue = useMemo(() => r?.dailyRevenue || [], [r])
  const topServices = useMemo(() => r?.topServices?.slice(0, 5) || [], [r])
  const topUsers = useMemo(() => r?.topUsers?.slice(0, 5) || [], [r])
  const maxDailyRev = useMemo(() => Math.max(...dailyRevenue.map(d => d.revenue), 1), [dailyRevenue])

  const isLoading = dashLoading
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const loadDetail = async (id: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/orders/${id}`, { credentials: 'same-origin' })
      if (res.ok) setViewOrder(await res.json())
      else toast('error', 'Failed to load order')
    } catch { toast('error', 'Failed to load order') }
    finally { setDetailLoading(false) }
  }

  if (isLoading) {
    return (
      <div>
        <Header title="Dashboard" subtitle="Loading..." />
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonStat key={i} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SkeletonCard className="lg:col-span-2 h-64" />
            <SkeletonCard className="h-64" />
          </div>
        </div>
      </div>
    )
  }

  if (dashError) {
    return (
      <div>
        <Header title="Dashboard" />
        <div className="p-4 flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-red-400 text-sm">{dashError}</p>
          <Link href="/login" className="text-[var(--accent)] text-sm hover:underline">Go to Login</Link>
        </div>
      </div>
    )
  }

  const pendingOrders = sc?.counts?.pending || s?.pendingOrders || 0
  const processingOrders = sc?.counts?.processing || s?.processingOrders || 0
  const completedToday = s?.completedToday || 0
  const rejectedToday = (sc?.counts?.rejected || s?.rejectedOrders || 0) + (sc?.counts?.failed || s?.failedOrders || 0)
  const totalOrders = sc?.total || s?.totalOrders || 0
  const successRate = totalOrders > 0 ? Math.round(((sc?.counts?.completed || s?.completedOrders || 0) / totalOrders) * 100) : 0

  const pendingTasks = [
    { label: 'Pending Deposits', count: pendingDepositCount, href: '/admin/deposit-requests?status=pending', icon: CreditCard, color: 'text-amber-500' },
    { label: 'Unassigned Orders', count: pendingOrders, href: '/admin/orders?status=pending', icon: ShoppingCart, color: 'text-blue-500' },
    { label: 'Processing Orders', count: processingOrders, href: '/admin/orders?status=processing', icon: RefreshCw, color: 'text-purple-500' },
    { label: 'Rejected Orders', count: rejectedToday, href: '/admin/orders?status=rejected', icon: XCircle, color: 'text-red-500' },
  ]

  return (
    <div>
      <Header title="Dashboard" subtitle={`${dateStr}`} />
      <div className="p-4 space-y-4">

        {/* SECTION 2: Business Overview — 8 Stat Cards */}
        <motion.div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3" {...fadeUp}>
          <Link href="/admin/orders">
            <StatCard title="Revenue Today" value={`$${(s?.revenueToday || 0).toLocaleString()}`} icon={DollarSign} color="green" change={`Month: $${(s?.revenueThisMonth || 0).toLocaleString()}`} changeType="up" />
          </Link>
          <Link href="/admin/orders">
            <StatCard title="Today's Profit" value={`$${(s?.totalProfit || 0).toLocaleString()}`} icon={TrendingUp} color="emerald" change={`${successRate}% success`} changeType="up" />
          </Link>
          <Link href="/admin/orders?status=pending">
            <StatCard title="Pending Orders" value={pendingOrders} icon={Clock} color="amber" change="Needs attention" changeType={pendingOrders > 0 ? 'down' : 'neutral'} />
          </Link>
          <Link href="/admin/orders?status=processing">
            <StatCard title="Processing" value={processingOrders} icon={RefreshCw} color="blue" change="In progress" changeType="neutral" />
          </Link>
        </motion.div>
        <motion.div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3" {...fadeUp} transition={{ delay: 0.04 }}>
          <StatCard title="Completed Today" value={completedToday} icon={CheckCircle} color="green" change="Keep it up" changeType="up" />
          <StatCard title="Rejected Today" value={rejectedToday} icon={XCircle} color="red" change={rejectedToday > 0 ? 'Needs review' : 'All clear'} changeType={rejectedToday > 0 ? 'down' : 'up'} />
          <Link href="/admin/wallet">
            <StatCard title="Wallet Balance" value={`$${(s?.walletBalance || 0).toLocaleString()}`} icon={Wallet} color="purple" />
          </Link>
          <Link href="/admin/users">
            <StatCard title="Total Users" value={s?.totalUsers || 0} icon={Users} color="indigo" change={`${r?.summary?.activeUsers || 0} active`} changeType="neutral" />
          </Link>
        </motion.div>

        {/* SECTION 3: Quick Actions */}
        <motion.div {...fadeUp} transition={{ delay: 0.08 }}>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.label} href={action.href}>
                <GlassCard hover padding="p-3" className="group cursor-pointer text-center">
                  <div className={`w-10 h-10 mx-auto rounded-xl bg-gradient-to-br ${action.gradient} shadow-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                    <action.icon size={18} className="text-white" />
                  </div>
                  <span className="text-[10px] font-medium text-[var(--foreground)] leading-tight block">{action.label}</span>
                </GlassCard>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* SECTION 4: Order Overview — Revenue Chart + Order Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div className="lg:col-span-2" {...fadeUp} transition={{ delay: 0.12 }}>
            <GlassCard padding="p-0" className="h-full">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-[var(--accent)]" />
                  <h3 className="text-sm font-bold text-[var(--foreground)]">Revenue Trend (30 Days)</h3>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[var(--muted)]">
                  <span className="font-bold text-[var(--foreground)]">${(r?.summary?.revenue || 0).toLocaleString()}</span> revenue
                  <span className="text-[var(--card-border)]">|</span>
                  <span className="font-bold text-emerald-500">${(r?.summary?.profit || 0).toLocaleString()}</span> profit
                </div>
              </div>
              <div className="px-4 pb-4">
                <div className="flex items-end gap-[3px] h-36">
                  {dailyRevenue.slice(-30).map((day, i) => {
                    const h = maxDailyRev > 0 ? (day.revenue / maxDailyRev) * 100 : 0
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group/col" title={`${day.date}: $${day.revenue.toLocaleString()} (${day.orders} orders)`}>
                        <motion.div
                          className="w-full rounded-t-sm bg-gradient-to-t from-[var(--accent)] to-[var(--accent-light, var(--accent))] opacity-75 hover:opacity-100 transition-all cursor-pointer min-h-[1px]"
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(h, 1)}%` }}
                          transition={{ delay: 0.15 + i * 0.015, duration: 0.35 }}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.16 }}>
            <GlassCard className="h-full">
              <div className="flex items-center gap-2 mb-3">
                <Activity size={16} className="text-[var(--accent)]" />
                <h3 className="text-sm font-bold text-[var(--foreground)]">Order Status</h3>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Pending', count: sc?.counts?.pending || 0, color: 'bg-amber-500', w: totalOrders },
                  { label: 'Assigned', count: 0, color: 'bg-blue-400', w: totalOrders },
                  { label: 'Processing', count: sc?.counts?.processing || 0, color: 'bg-blue-500', w: totalOrders },
                  { label: 'Completed', count: sc?.counts?.completed || 0, color: 'bg-emerald-500', w: totalOrders },
                  { label: 'Failed', count: sc?.counts?.failed || 0, color: 'bg-red-500', w: totalOrders },
                  { label: 'Rejected', count: sc?.counts?.rejected || 0, color: 'bg-red-600', w: totalOrders },
                  { label: 'Refunded', count: sc?.counts?.refunded || 0, color: 'bg-purple-500', w: totalOrders },
                  { label: 'Cancelled', count: sc?.counts?.cancelled || 0, color: 'bg-gray-500', w: totalOrders },
                ].map(st => (
                  <div key={st.label} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${st.color} shrink-0`} />
                    <span className="text-[11px] text-[var(--muted)] flex-1">{st.label}</span>
                    <span className="text-[11px] font-bold text-[var(--foreground)] w-6 text-right">{st.count}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-[var(--card-border)] space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--muted)]">Success Rate</span>
                  <span className="font-bold text-emerald-500">{successRate}%</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--muted)]">Avg Order Value</span>
                  <span className="font-bold text-[var(--foreground)]">${(r?.summary?.avgOrderValue || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--muted)]">Conversion</span>
                  <span className="font-bold text-[var(--foreground)]">{r?.summary?.conversionRate || '0'}%</span>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* SECTION 5: Recent Orders Table */}
        <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
          <GlassCard padding="p-0">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <ShoppingCart size={16} className="text-[var(--accent)]" />
                <h3 className="text-sm font-bold text-[var(--foreground)]">Recent Orders</h3>
                <span className="text-[10px] text-[var(--muted)]">({ordersRes?.pagination?.total || 0} total)</span>
              </div>
              <Link href="/admin/orders" className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
                View all <ArrowUpRight size={11} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--card-border)]">
                    <th className="text-left py-2 px-4 text-[var(--muted)] font-medium text-[10px] uppercase tracking-wider">Order</th>
                    <th className="text-left py-2 px-2 text-[var(--muted)] font-medium text-[10px] uppercase tracking-wider">Customer</th>
                    <th className="text-left py-2 px-2 text-[var(--muted)] font-medium text-[10px] uppercase tracking-wider">Service</th>
                    <th className="text-left py-2 px-2 text-[var(--muted)] font-medium text-[10px] uppercase tracking-wider">IMEI/SN</th>
                    <th className="text-left py-2 px-2 text-[var(--muted)] font-medium text-[10px] uppercase tracking-wider">Supplier</th>
                    <th className="text-left py-2 px-2 text-[var(--muted)] font-medium text-[10px] uppercase tracking-wider">Status</th>
                    <th className="text-right py-2 px-2 text-[var(--muted)] font-medium text-[10px] uppercase tracking-wider">Price</th>
                    <th className="text-left py-2 px-2 text-[var(--muted)] font-medium text-[10px] uppercase tracking-wider">Time</th>
                    <th className="text-center py-2 px-4 text-[var(--muted)] font-medium text-[10px] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center">
                        <ShoppingCart size={32} className="mx-auto text-[var(--muted)] mb-2 opacity-40" />
                        <p className="text-sm text-[var(--muted)] font-medium">No orders yet</p>
                        <p className="text-xs text-[var(--muted)] mt-1">Create your first order to get started</p>
                        <Link href="/admin/orders"><GlassButton size="sm" className="mt-3"><Plus size={14} /> Create Order</GlassButton></Link>
                      </td>
                    </tr>
                  ) : orders.map((order) => (
                    <tr key={order.id} className="border-b border-[var(--card-border)] hover:bg-white/5 transition-colors cursor-pointer" onClick={() => loadDetail(order.id)}>
                      <td className="py-2.5 px-4 font-mono font-medium text-[var(--foreground)] text-xs">{order.orderNumber}</td>
                      <td className="py-2.5 px-2 text-xs text-[var(--foreground)] truncate max-w-[100px]">{order.userName || 'N/A'}</td>
                      <td className="py-2.5 px-2 text-xs text-[var(--foreground)] truncate max-w-[120px]">{order.serviceName || 'N/A'}</td>
                      <td className="py-2.5 px-2 font-mono text-[10px] text-[var(--muted)] truncate max-w-[100px]">{resolveOrderImei(order)}</td>
                      <td className="py-2.5 px-2 text-xs text-[var(--muted)] truncate max-w-[80px]">{order.supplierName || '—'}</td>
                      <td className="py-2.5 px-2"><StatusBadge status={order.status} /></td>
                      <td className="py-2.5 px-2 text-right font-medium text-xs text-[var(--foreground)]">${(order.sellingPrice || 0).toFixed(2)}</td>
                      <td className="py-2.5 px-2 text-[10px] text-[var(--muted)] whitespace-nowrap">{timeAgo(order.createdAt)}</td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button className="p-1 rounded hover:bg-white/10 text-[var(--muted)] hover:text-[var(--accent)] transition-colors" title="View"><Eye size={12} /></button>
                          <button className="p-1 rounded hover:bg-white/10 text-[var(--muted)] hover:text-[var(--accent)] transition-colors" title="Reply"><Reply size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </motion.div>

        {/* SECTION 6: Pending Tasks */}
        <motion.div {...fadeUp} transition={{ delay: 0.24 }}>
          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-amber-500" />
              <h3 className="text-sm font-bold text-[var(--foreground)]">Pending Tasks</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {pendingTasks.map(task => (
                <Link key={task.label} href={task.href}>
                  <div className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)] hover:bg-white/8 hover:border-[var(--accent)]/30 transition-all cursor-pointer group">
                    <div className="flex items-center justify-between mb-2">
                      <task.icon size={16} className={`${task.color} group-hover:scale-110 transition-transform`} />
                      <span className="text-lg font-bold text-[var(--foreground)]">{task.count}</span>
                    </div>
                    <p className="text-[11px] text-[var(--muted)] font-medium">{task.label}</p>
                  </div>
                </Link>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* SECTION 7+8+9: Top Customers + Top Services + Supplier Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Top Customers */}
          <motion.div {...fadeUp} transition={{ delay: 0.28 }}>
            <GlassCard className="h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Crown size={16} className="text-amber-500" />
                  <h3 className="text-sm font-bold text-[var(--foreground)]">Top Customers</h3>
                </div>
                <Link href="/admin/users" className="text-[10px] text-[var(--accent)] hover:underline flex items-center gap-1">View all <ArrowUpRight size={10} /></Link>
              </div>
              <div className="space-y-2">
                {topUsers.length === 0 ? (
                  <div className="py-6 text-center">
                    <Users size={24} className="mx-auto text-[var(--muted)] mb-2 opacity-40" />
                    <p className="text-xs text-[var(--muted)]">No customer data yet</p>
                  </div>
                ) : topUsers.map((u, i) => (
                  <div key={u.email} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-light, var(--accent))] flex items-center justify-center text-[10px] font-bold text-[var(--background)] shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--foreground)] truncate">{u.name}</p>
                      <p className="text-[10px] text-[var(--muted)]">{u.orders} orders</p>
                    </div>
                    <span className="text-xs font-bold text-[var(--foreground)]">${u.spent.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Top Services */}
          <motion.div {...fadeUp} transition={{ delay: 0.32 }}>
            <GlassCard className="h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-500" />
                  <h3 className="text-sm font-bold text-[var(--foreground)]">Top Services</h3>
                </div>
                <Link href="/admin/services" className="text-[10px] text-[var(--accent)] hover:underline flex items-center gap-1">View all <ArrowUpRight size={10} /></Link>
              </div>
              <div className="space-y-2">
                {topServices.length === 0 ? (
                  <div className="py-6 text-center">
                    <Package size={24} className="mx-auto text-[var(--muted)] mb-2 opacity-40" />
                    <p className="text-xs text-[var(--muted)]">No service data yet</p>
                  </div>
                ) : topServices.map((svc, i) => {
                  const maxRev = topServices[0]?.revenue || 1
                  return (
                    <div key={svc.name} className="space-y-1 p-2 rounded-lg hover:bg-white/5 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-4 text-[10px] font-bold text-[var(--muted)]">#{i + 1}</span>
                          <span className="text-xs font-medium text-[var(--foreground)] truncate">{svc.name}</span>
                        </div>
                        <span className="text-[10px] font-bold text-[var(--foreground)]">${svc.revenue.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light, var(--accent))]"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.round((svc.revenue / maxRev) * 100)}%` }}
                            transition={{ delay: 0.4, duration: 0.4 }}
                          />
                        </div>
                        <span className="text-[10px] text-[var(--muted)] w-12 text-right">{svc.orders} ord.</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </GlassCard>
          </motion.div>

          {/* Supplier Status */}
          <motion.div {...fadeUp} transition={{ delay: 0.36 }}>
            <GlassCard className="h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-emerald-500" />
                  <h3 className="text-sm font-bold text-[var(--foreground)]">Suppliers</h3>
                </div>
                <Link href="/admin/suppliers" className="text-[10px] text-[var(--accent)] hover:underline flex items-center gap-1">Manage <ArrowUpRight size={10} /></Link>
              </div>
              <div className="space-y-2">
                {suppliers.length === 0 ? (
                  <div className="py-6 text-center">
                    <Globe size={24} className="mx-auto text-[var(--muted)] mb-2 opacity-40" />
                    <p className="text-xs text-[var(--muted)]">No suppliers configured</p>
                    <Link href="/admin/suppliers"><GlassButton size="sm" className="mt-2"><Plus size={12} /> Add Supplier</GlassButton></Link>
                  </div>
                ) : suppliers.map((sup) => (
                  <div key={sup.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${sup.status === 'active' ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                      <Radio size={14} className={sup.status === 'active' ? 'text-emerald-500' : 'text-red-500'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--foreground)] truncate">{sup.name}</p>
                      <p className="text-[10px] text-[var(--muted)]">{sup.type} &middot; {sup.orderCount || sup.totalOrders || 0} orders</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold ${sup.successRate >= 80 ? 'text-emerald-500' : sup.successRate >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{sup.successRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* SECTION 10+11: Recent Activity + Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Activity */}
          <motion.div {...fadeUp} transition={{ delay: 0.4 }}>
            <GlassCard className="h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-emerald-500" />
                  <h3 className="text-sm font-bold text-[var(--foreground)]">Recent Activity</h3>
                </div>
                <Link href="/admin/audit" className="text-[10px] text-[var(--accent)] hover:underline flex items-center gap-1">View all <ArrowUpRight size={10} /></Link>
              </div>
              <div className="relative">
                <div className="absolute left-[13px] top-2 bottom-2 w-px bg-[var(--card-border)]" />
                <div className="space-y-0 max-h-[300px] overflow-y-auto">
                  {auditLogs.length === 0 ? (
                    <div className="py-6 text-center">
                      <Activity size={24} className="mx-auto text-[var(--muted)] mb-2 opacity-40" />
                      <p className="text-xs text-[var(--muted)]">No activity yet</p>
                    </div>
                  ) : auditLogs.slice(0, 12).map((log) => {
                    const actionInfo = auditActionLabel(log.action)
                    return (
                      <div key={log.id} className="relative flex items-start gap-2.5 py-2 px-1">
                        <div className="relative z-10 mt-0.5 shrink-0 w-6 h-6 rounded-full bg-[var(--card-bg)] flex items-center justify-center border border-[var(--card-border)]">
                          <span className={`text-[8px] font-bold px-1 ${actionInfo.color} rounded-full`}>
                            {log.action.split('.')[0]?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium text-[var(--foreground)]">{actionInfo.label}</span>
                          </div>
                          <p className="text-[10px] text-[var(--muted)] truncate">
                            {log.userEmail || 'System'} &middot; {log.entityType}{log.entityId ? ` #${log.entityId.slice(0, 8)}` : ''}
                          </p>
                        </div>
                        <span className="text-[10px] text-[var(--muted)] whitespace-nowrap shrink-0 mt-0.5">{timeAgo(log.createdAt)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Notifications */}
          <motion.div {...fadeUp} transition={{ delay: 0.44 }}>
            <GlassCard className="h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-[var(--accent)]" />
                  <h3 className="text-sm font-bold text-[var(--foreground)]">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] text-[10px] font-bold">{unreadCount}</span>
                  )}
                </div>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center">
                    <Bell size={24} className="mx-auto text-[var(--muted)] mb-2 opacity-40" />
                    <p className="text-xs text-[var(--muted)]">No notifications</p>
                  </div>
                ) : notifications.slice(0, 10).map((n) => {
                  const iconMap: Record<string, typeof Bell> = { success: CheckCircle, warning: AlertTriangle, error: XCircle, info: Bell }
                  const colorMap: Record<string, string> = { success: 'text-emerald-400 bg-emerald-500/10', warning: 'text-amber-400 bg-amber-500/10', error: 'text-red-400 bg-red-500/10', info: 'text-blue-400 bg-blue-500/10' }
                  const Icon = iconMap[n.type] || Bell
                  const cc = colorMap[n.type] || colorMap.info
                  return (
                    <div key={n.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg transition-colors ${n.read ? 'opacity-60' : 'bg-white/5 border border-[var(--card-border)]'}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cc}`}>
                        <Icon size={12} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-[var(--foreground)] truncate">{n.title}</p>
                        <p className="text-[10px] text-[var(--muted)] truncate">{n.message}</p>
                        <p className="text-[9px] text-[var(--muted)] mt-0.5">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5 flex-shrink-0" />}
                    </div>
                  )
                })}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* SECTION 12: System Health + SECTION 13: Announcements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* System Health */}
          <motion.div {...fadeUp} transition={{ delay: 0.48 }}>
            <GlassCard>
              <div className="flex items-center gap-2 mb-3">
                <Server size={16} className="text-emerald-500" />
                <h3 className="text-sm font-bold text-[var(--foreground)]">System Health</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'API Status', status: 'healthy', icon: Wifi },
                  { label: 'Database', status: 'healthy', icon: Database },
                  { label: 'Storage', status: 'healthy', icon: HardDrive },
                  { label: 'Queue', status: 'healthy', icon: Layers },
                  { label: 'Background Jobs', status: 'healthy', icon: Play },
                  { label: 'Railway', status: 'healthy', icon: Server },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5">
                    <item.icon size={14} className="text-[var(--muted)]" />
                    <div className="flex-1">
                      <p className="text-[11px] font-medium text-[var(--foreground)]">{item.label}</p>
                    </div>
                    <span className={`flex items-center gap-1 text-[10px] font-medium ${item.status === 'healthy' ? 'text-emerald-500' : item.status === 'warning' ? 'text-amber-500' : 'text-red-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'healthy' ? 'bg-emerald-500' : item.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'} ${item.status === 'healthy' ? 'animate-pulse' : ''}`} />
                      {item.status === 'healthy' ? 'Online' : item.status === 'warning' ? 'Warning' : 'Error'}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Announcements */}
          <motion.div {...fadeUp} transition={{ delay: 0.52 }}>
            <GlassCard>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={16} className="text-amber-500" />
                <h3 className="text-sm font-bold text-[var(--foreground)]">Announcements</h3>
              </div>
              <div className="space-y-2">
                {notifications.filter(n => n.type === 'warning' || n.type === 'info').length === 0 ? (
                  <div className="py-6 text-center">
                    <MessageSquare size={24} className="mx-auto text-[var(--muted)] mb-2 opacity-40" />
                    <p className="text-xs text-[var(--muted)]">No announcements</p>
                    <p className="text-[10px] text-[var(--muted)] mt-1">System updates and notices will appear here</p>
                  </div>
                ) : notifications.filter(n => n.type === 'warning' || n.type === 'info').slice(0, 4).map(n => (
                  <div key={n.id} className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <p className="text-xs font-medium text-[var(--foreground)]">{n.title}</p>
                    <p className="text-[10px] text-[var(--muted)] mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[9px] text-[var(--muted)] mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                ))}
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
