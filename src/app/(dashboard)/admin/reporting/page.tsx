'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { useApi } from '@/hooks/useApi'
import { motion } from 'framer-motion'
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Users,
  Package,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react'

const RANGE_OPTIONS = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '1y', label: '1 Year' },
]

interface ReportingData {
  summary: {
    revenue: number
    profit: number
    totalOrders: number
    avgOrderValue: number
    activeUsers: number
    activeServices: number
    conversionRate: number
    completedOrders: number
  }
  dailyRevenue: { date: string; revenue: number; orders: number }[]
  topServices: { name: string; revenue: number; orders: number }[]
  topUsers: { name: string; email: string; spent: number; orders: number }[]
  statusDistribution: { status: string; count: number }[]
}

export default function ReportingPage() {
  const [range, setRange] = useState('30d')
  const { data: report, loading } = useApi<ReportingData>({ url: `/api/reporting?range=${range}` })

  if (loading) {
    return (
      <div>
        <Header title="Reporting & Analytics" subtitle="Business intelligence dashboard" />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
        </div>
      </div>
    )
  }

  const s = report?.summary ?? { revenue: 0, profit: 0, totalOrders: 0, avgOrderValue: 0, activeUsers: 0, activeServices: 0, conversionRate: 0, completedOrders: 0 }
  const daily = report?.dailyRevenue || []
  const topServices = report?.topServices || []
  const topUsers = report?.topUsers || []
  const statusDist = report?.statusDistribution || []

  const maxRevenue = Math.max(...daily.map((d: { revenue: number }) => d.revenue), 1)

  return (
    <div>
      <Header title="Reporting & Analytics" subtitle="Business intelligence dashboard" />
      <div className="p-6 space-y-6">
        {/* Range Selector */}
        <div className="flex items-center gap-2">
          {RANGE_OPTIONS.map(opt => (
            <GlassButton
              key={opt.value}
              size="sm"
              variant={range === opt.value ? 'primary' : 'secondary'}
              onClick={() => setRange(opt.value)}
            >
              {opt.label}
            </GlassButton>
          ))}
        </div>

        {/* Summary Stats */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ staggerChildren: 0.05 }}
        >
          <GlassCard padding="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                <DollarSign size={18} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-[var(--muted)]">Revenue</p>
                <p className="text-lg font-bold text-[var(--foreground)]">${s.revenue?.toLocaleString() || '0'}</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard padding="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <TrendingUp size={18} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-[var(--muted)]">Profit</p>
                <p className="text-lg font-bold text-[var(--foreground)]">${s.profit?.toLocaleString() || '0'}</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard padding="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <ShoppingCart size={18} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-[var(--muted)]">Orders</p>
                <p className="text-lg font-bold text-[var(--foreground)]">{s.totalOrders || 0}</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard padding="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <BarChart3 size={18} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-[var(--muted)]">Avg Order</p>
                <p className="text-lg font-bold text-[var(--foreground)]">${s.avgOrderValue?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard padding="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                <Users size={18} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-[var(--muted)]">Active Users</p>
                <p className="text-lg font-bold text-[var(--foreground)]">{s.activeUsers || 0}</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard padding="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                <Package size={18} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-[var(--muted)]">Services</p>
                <p className="text-lg font-bold text-[var(--foreground)]">{s.activeServices || 0}</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Revenue Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard>
            <h3 className="text-lg font-bold text-[var(--foreground)] mb-4">Revenue Trend (30 Days)</h3>
            <div className="h-48 flex items-end gap-1">
              {daily.map((d: { date: string; revenue: number; orders: number }, i: number) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-emerald-600 to-emerald-400 min-h-[2px] transition-all hover:from-emerald-500 hover:to-emerald-300"
                    style={{ height: `${(d.revenue / maxRevenue) * 100}%` }}
                    title={`${d.date}: $${d.revenue} (${d.orders} orders)`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-[var(--muted)]">{daily[0]?.date}</span>
              <span className="text-[10px] text-[var(--muted)]">{daily[daily.length - 1]?.date}</span>
            </div>
          </GlassCard>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Services */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <GlassCard>
              <h3 className="text-lg font-bold text-[var(--foreground)] mb-4">Top Services</h3>
              {topServices.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {topServices.map((svc: { name: string; revenue: number; orders: number }, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[var(--muted)] w-4">#{i + 1}</span>
                        <span className="text-sm text-[var(--foreground)]">{svc.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-[var(--foreground)]">${svc.revenue.toLocaleString()}</span>
                        <span className="text-xs text-[var(--muted)] ml-2">{svc.orders} orders</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>

          {/* Top Users */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <GlassCard>
              <h3 className="text-lg font-bold text-[var(--foreground)] mb-4">Top Clients</h3>
              {topUsers.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {topUsers.map((u: { name: string; email: string; spent: number; orders: number }, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[var(--muted)] w-4">#{i + 1}</span>
                        <div>
                          <span className="text-sm text-[var(--foreground)]">{u.name}</span>
                          <span className="text-xs text-[var(--muted)] ml-2">{u.email}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-[var(--foreground)]">${u.spent.toLocaleString()}</span>
                        <span className="text-xs text-[var(--muted)] ml-2">{u.orders} orders</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>
        </div>

        {/* Status Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <GlassCard>
            <h3 className="text-lg font-bold text-[var(--foreground)] mb-4">Order Status Distribution</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {statusDist.map((item: { status: string; count: number }) => {
                const colors: Record<string, { bg: string; text: string; icon: typeof ArrowUpRight }> = {
                  completed: { bg: 'from-emerald-500 to-green-500', text: 'text-emerald-400', icon: ArrowUpRight },
                  pending: { bg: 'from-amber-500 to-yellow-500', text: 'text-amber-400', icon: ShoppingCart },
                  failed: { bg: 'from-red-500 to-rose-500', text: 'text-red-400', icon: ArrowDownRight },
                  cancelled: { bg: 'from-gray-500 to-slate-500', text: 'text-gray-400', icon: ArrowDownRight },
                }
                const c = colors[item.status] || colors.pending
                const Icon = c.icon
                return (
                  <div key={item.status} className="text-center p-4 rounded-xl bg-white/5">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.bg} flex items-center justify-center mx-auto mb-2`}>
                      <Icon size={18} className="text-white" />
                    </div>
                    <p className="text-2xl font-bold text-[var(--foreground)]">{item.count}</p>
                    <p className="text-xs text-[var(--muted)] capitalize">{item.status}</p>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        </motion.div>

        {/* Conversion Rate */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[var(--foreground)]">Conversion Rate</h3>
                <p className="text-sm text-[var(--muted)]">Completed orders / Total orders</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-emerald-400">{s.conversionRate || '0'}%</span>
                <p className="text-xs text-[var(--muted)]">{s.completedOrders || 0} / {s.totalOrders || 0}</p>
              </div>
            </div>
            <div className="mt-3 h-3 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all"
                style={{ width: `${s.conversionRate || 0}%` }}
              />
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  )
}
