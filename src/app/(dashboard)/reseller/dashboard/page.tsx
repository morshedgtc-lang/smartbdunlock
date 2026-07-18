'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/lib/api'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ShoppingCart, Wallet, Loader2, Package,
  CheckCircle2, Clock, ArrowRight, CreditCard,
} from 'lucide-react'

const container = { animate: { transition: { staggerChildren: 0.08 } } }
const item = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }

interface DashboardStats {
  totalOrders: number
  pendingOrders: number
  completedToday: number
  revenueThisMonth: number
}

interface OrderItem {
  id: string
  orderNumber: string
  status: string
  sellingPrice: number
  imei?: string
  service?: { name: string }
}

interface WalletData {
  balance: number
}

interface ServiceItem {
  id: string
  name: string
  status: string
  clientVisible?: boolean
}

const QUICK_ACTIONS = [
  { label: 'Browse Services', href: '/reseller/services', icon: Package, gradient: 'from-indigo-500 to-purple-500', shadow: 'shadow-indigo-500/20' },
  { label: 'Create Order', href: '/reseller/services', icon: ShoppingCart, gradient: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/20' },
  { label: 'Deposit Balance', href: '/reseller/wallet', icon: CreditCard, gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/20' },
  { label: 'View Orders', href: '/reseller/orders', icon: Clock, gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/20' },
]

export default function ClientDashboard() {
  const { data: stats, loading: statsLoading, error: statsError } = useApi<DashboardStats>({ url: '/api/dashboard' })
  const { data: ordersRes, loading: ordersLoading } = useApi<{ orders: OrderItem[] }>({ url: '/api/orders?limit=5' })
  const { data: walletData } = useApi<WalletData>({ url: '/api/wallet' })
  const { data: servicesData } = useApi<{ services: ServiceItem[] }>({ url: '/api/services' })
  const { user } = useAuth()

  const recentOrders = ordersRes?.orders || []
  const balance = walletData?.balance ?? 0
  const allServices = servicesData?.services || []
  const activeServices = allServices.filter((s: ServiceItem) => s.status === 'active' && s.clientVisible !== false).length

  if (statsLoading || ordersLoading) {
    return (
      <div>
        <Header title="Client Dashboard" subtitle="Loading..." />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
        </div>
      </div>
    )
  }

  if (statsError) {
    return (
      <div>
        <Header title="Client Dashboard" />
        <div className="p-6 flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-red-400 text-sm">{statsError}</p>
          <Link href="/login" className="text-[var(--accent)] text-sm hover:underline">Go to Login</Link>
        </div>
      </div>
    )
  }

  const s = stats || { totalOrders: 0, pendingOrders: 0, completedToday: 0, revenueThisMonth: 0 }

  const statCards = [
    { title: 'Wallet Balance', value: `$${balance.toLocaleString()}`, icon: Wallet, gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/20', href: '/reseller/wallet' },
    { title: 'Active Orders', value: s.pendingOrders, icon: Clock, gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/20', href: '/reseller/orders' },
    { title: 'Completed', value: s.completedToday, icon: CheckCircle2, gradient: 'from-green-500 to-emerald-500', shadow: 'shadow-green-500/20', href: '/reseller/orders' },
    { title: 'Services', value: activeServices, icon: Package, gradient: 'from-indigo-500 to-purple-500', shadow: 'shadow-indigo-500/20', href: '/reseller/services' },
  ]

  return (
    <div>
      <Header title="Client Dashboard" subtitle="Welcome back" />
      <div className="p-6 space-y-6">
        {/* User ID */}
        {user?.userId && (
          <GlassCard padding="p-5">
            <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-1">Your User ID</p>
            <p className="text-xl font-bold text-[var(--foreground)] font-mono">{user.userId}</p>
          </GlassCard>
        )}

        {/* Stat Cards */}
        <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4" variants={container} initial="initial" animate="animate">
          {statCards.map((card) => (
            <motion.div key={card.title} variants={item}>
              <Link href={card.href}>
                <GlassCard hover padding="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">{card.title}</p>
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.gradient} ${card.shadow} shadow-lg flex items-center justify-center`}>
                      <card.icon size={16} className="text-white" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-[var(--foreground)]">{card.value}</p>
                </GlassCard>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Orders */}
          <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <GlassCard padding="p-0">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--card-border)]">
                <h3 className="font-bold text-[var(--foreground)]">Recent Orders</h3>
              </div>
              {recentOrders.length === 0 ? (
                <div className="py-12 text-center">
                  <ShoppingCart size={36} className="mx-auto text-[var(--muted)] mb-3 opacity-40" />
                  <p className="text-[var(--muted)] text-sm">No orders yet</p>
                  <Link href="/reseller/services" className="text-xs text-[var(--accent)] hover:underline mt-1 inline-block">Browse Services</Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--card-border)]">
                        <th className="text-left px-6 py-3 text-[var(--muted)] font-medium text-xs uppercase tracking-wider">Order ID</th>
                        <th className="text-left px-6 py-3 text-[var(--muted)] font-medium text-xs uppercase tracking-wider">Service Name</th>
                        <th className="text-left px-6 py-3 text-[var(--muted)] font-medium text-xs uppercase tracking-wider">IMEI / SN</th>
                        <th className="text-left px-6 py-3 text-[var(--muted)] font-medium text-xs uppercase tracking-wider">Status</th>
                        <th className="text-right px-6 py-3 text-[var(--muted)] font-medium text-xs uppercase tracking-wider">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order: OrderItem) => (
                        <tr key={order.id} className="hover:bg-white/5 transition-colors border-b border-[var(--card-border)]">
                          <td className="px-6 py-3.5">
                            <Link
                              href={`/reseller/orders/${order.id}`}
                              className="text-[var(--accent)] hover:underline cursor-pointer font-mono text-sm"
                            >
                              {order.orderNumber}
                            </Link>
                          </td>
                          <td className="px-6 py-3.5 text-sm text-[var(--foreground)]">{order.service?.name || 'N/A'}</td>
                          <td className="px-6 py-3.5 text-sm text-[var(--muted)] font-mono">{order.imei || '—'}</td>
                          <td className="px-6 py-3.5">
                            <StatusBadge status={order.status} />
                          </td>
                          <td className="px-6 py-3.5 text-sm font-bold text-[var(--foreground)] text-right">
                            ${order.sellingPrice?.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="px-6 py-4 border-t border-[var(--card-border)]">
                <Link
                  href="/reseller/orders"
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline font-medium"
                >
                  View All Orders <ArrowRight size={12} />
                </Link>
              </div>
            </GlassCard>
          </motion.div>

          {/* Quick Actions */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <GlassCard>
              <h3 className="font-bold text-[var(--foreground)] mb-4">Quick Actions</h3>
              <div className="space-y-2.5">
                {QUICK_ACTIONS.map((action) => (
                  <Link key={action.label} href={action.href}>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/8 border border-transparent hover:border-[var(--card-border)] transition-all cursor-pointer group">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${action.gradient} ${action.shadow} shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <action.icon size={16} className="text-white" />
                      </div>
                      <span className="text-sm font-medium text-[var(--foreground)]">{action.label}</span>
                      <ArrowRight size={14} className="text-[var(--muted)] ml-auto group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
