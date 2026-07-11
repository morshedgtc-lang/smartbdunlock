'use client'

import { Header } from '@/components/layout/Header'
import { StatCard } from '@/components/ui/StatCard'
import { GlassCard } from '@/components/ui/GlassCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useApi } from '@/lib/useApi'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ShoppingCart, Wallet, TrendingUp, Loader2 } from 'lucide-react'

const container = { animate: { transition: { staggerChildren: 0.08 } } }
const item = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }

export default function ResellerDashboard() {
  const { data: stats, loading: statsLoading } = useApi<any>({ url: '/api/dashboard' })
  const { data: ordersRes, loading: ordersLoading } = useApi<any>({ url: '/api/orders?limit=5' })
  const { data: walletData } = useApi<any>({ url: '/api/wallet' })

  const recentOrders = ordersRes?.orders || []
  const balance = walletData?.balance ?? 0

  if (statsLoading || ordersLoading) {
    return (
      <div>
        <Header title="Reseller Dashboard" subtitle="Loading..." />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
        </div>
      </div>
    )
  }

  const s = stats || { totalOrders: 0, pendingOrders: 0, completedToday: 0, revenueThisMonth: 0, totalServices: 0 }
  return (
    <div>
      <Header title="Reseller Dashboard" subtitle="Welcome back, Master Reseller" />
      <div className="p-6 space-y-6">
        <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" variants={container} initial="initial" animate="animate">
          <motion.div variants={item}>
            <StatCard title="My Orders" value={s.totalOrders} icon={ShoppingCart} color="indigo" />
          </motion.div>
          <motion.div variants={item}>
            <StatCard title="Balance" value={`$${balance.toLocaleString()}`} icon={Wallet} color="green" />
          </motion.div>
          <motion.div variants={item}>
            <StatCard title="Total Spent" value={`$${s.revenueThisMonth.toLocaleString()}`} icon={TrendingUp} color="purple" />
          </motion.div>
          <motion.div variants={item}>
            <StatCard title="Pending Orders" value={s.pendingOrders} icon={ShoppingCart} color="amber" />
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--foreground)]">Recent Orders</h3>
                <a href="/reseller/orders" className="text-sm text-[var(--accent)] hover:underline">View all</a>
              </div>
              <div className="space-y-3">
                {recentOrders.map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between py-2 border-b border-[var(--card-border)] last:border-0">
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">{order.service?.name || 'N/A'}</p>
                      <p className="text-xs text-[var(--muted)]">{order.deviceInfo || 'N/A'} • {order.imei?.slice(0, 8)}...</p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <GlassCard>
              <h3 className="text-lg font-bold text-[var(--foreground)] mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/reseller/orders">
                  <GlassCard padding="p-4" className="cursor-pointer text-center group">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                      <ShoppingCart size={18} className="text-white" />
                    </div>
                    <p className="text-sm font-medium text-[var(--foreground)]">Create Order</p>
                  </GlassCard>
                </Link>
                <Link href="/reseller/wallet">
                  <GlassCard padding="p-4" className="cursor-pointer text-center group">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:scale-110 transition-transform">
                      <Wallet size={18} className="text-white" />
                    </div>
                    <p className="text-sm font-medium text-[var(--foreground)]">View Wallet</p>
                  </GlassCard>
                </Link>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
