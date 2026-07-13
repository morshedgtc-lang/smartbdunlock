'use client'

import { Header } from '@/components/layout/Header'
import { StatCard } from '@/components/ui/StatCard'
import { GlassCard } from '@/components/ui/GlassCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useApi } from '@/hooks/useApi'
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
  Plug,
} from 'lucide-react'

const container = { animate: { transition: { staggerChildren: 0.08 } } }
const item = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }

export default function AdminDashboard() {
  const { data: stats, loading: statsLoading, error: statsError } = useApi<any>({ url: '/api/dashboard' })
  const { data: ordersRes, loading: ordersLoading } = useApi<any>({ url: '/api/orders?limit=6' })
  const { data: suppliersRes } = useApi<any>({ url: '/api/suppliers' })

  const s = stats || { totalUsers: 0, totalOrders: 0, revenueToday: 0, pendingOrders: 0, completedToday: 0, failedOrders: 0, revenueThisMonth: 0, walletBalance: 0 }
  const recentOrders = ordersRes?.orders || []

  if (statsLoading) {
    return (
      <div>
        <Header title="Dashboard" subtitle="Welcome back, Admin" />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
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
        <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" variants={container} initial="initial" animate="animate">
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
            <Link href="/admin/wallet">
              <StatCard title="Revenue Today" value={`$${s.revenueToday.toLocaleString()}`} icon={DollarSign} color="green" />
            </Link>
          </motion.div>
          <motion.div variants={item}>
            <Link href="/admin/orders">
              <StatCard title="Pending Orders" value={s.pendingOrders} icon={Clock} color="amber" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--foreground)]">Recent Orders</h3>
                <Link href="/admin/orders" className="text-sm text-[var(--accent)] hover:underline">View all</Link>
              </div>
              <div className="table-responsive">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-[var(--card-border)]">
                      <th className="text-left py-3 px-2 text-[var(--muted)] font-medium">Order</th>
                      <th className="text-left py-3 px-2 text-[var(--muted)] font-medium">Service</th>
                      <th className="text-left py-3 px-2 text-[var(--muted)] font-medium">User</th>
                      <th className="text-left py-3 px-2 text-[var(--muted)] font-medium">Status</th>
                      <th className="text-right py-3 px-2 text-[var(--muted)] font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order: any) => (
                      <tr key={order.id} className="border-b border-[var(--card-border)] hover:bg-white/5 dark:hover:bg-white/5 transition-colors">
                        <td className="py-3 px-2 font-mono text-[var(--foreground)]">{order.orderNumber}</td>
                        <td className="py-3 px-2 text-[var(--foreground)]">{order.service?.name || 'N/A'}</td>
                        <td className="py-3 px-2 text-[var(--muted)]">{order.user?.name || 'N/A'}</td>
                        <td className="py-3 px-2"><StatusBadge status={order.status} /></td>
                        <td className="py-3 px-2 text-right font-medium text-[var(--foreground)]">${order.sellingPrice?.toFixed(2) || '0.00'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <GlassCard>
              <h3 className="text-lg font-bold text-[var(--foreground)] mb-4">Quick Stats</h3>
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
                    <TrendingUp size={16} className="text-blue-500" /> Monthly Revenue
                  </div>
                  <span className="text-sm font-bold text-[var(--foreground)]">${s.revenueThisMonth.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <Wallet size={16} className="text-purple-500" /> Wallet Balance
                  </div>
                  <span className="text-sm font-bold text-[var(--foreground)]">${s.walletBalance.toLocaleString()}</span>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-lg font-bold text-[var(--foreground)] mb-3">Suppliers</h3>
              <div className="space-y-2">
                {(suppliersRes?.suppliers || []).length === 0 && (
                  <p className="text-sm text-[var(--muted)]">No suppliers configured</p>
                )}
                {(suppliersRes?.suppliers || []).slice(0, 5).map((supplier: any) => (
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
      </div>
    </div>
  )
}
