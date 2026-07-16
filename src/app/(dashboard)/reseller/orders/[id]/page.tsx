'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Loader2, ArrowLeft, Clock, Calendar, Smartphone, CreditCard, MessageSquareText } from 'lucide-react'

interface OrderItem {
  id: string
  orderNumber: string
  status: string
  imei?: string
  deviceInfo?: string
  sellingPrice?: number
  priority?: string
  createdAt: string
  completedAt?: string
  notes?: string
  processingTime?: string
  service?: { name: string; type?: string }
}

interface TimelineEvent {
  id: string
  action: string
  description?: string
  createdAt: string
  author?: string
  type: 'status_change' | 'note' | 'priority_change' | 'assignment'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function OrderDetailsPage() {
  const params = useParams()
  const orderId = params.id as string

  const { data: ordersRes, loading: ordersLoading, error: ordersError } = useApi<{ orders: OrderItem[] }>({ url: '/api/orders' })
  const { data: timelineRes, loading: timelineLoading } = useApi<{ timeline: TimelineEvent[] }>({ url: `/api/orders/${orderId}/timeline` })

  const order = ordersRes?.orders?.find((o: OrderItem) => o.id === orderId) || null
  const timeline = timelineRes?.timeline || []
  const loading = ordersLoading || timelineLoading

  if (loading) {
    return (
      <div>
        <Header title="Order Details" subtitle="Loading..." />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
        </div>
      </div>
    )
  }

  if (ordersError || !order) {
    return (
      <div>
        <Header title="Order Details" />
        <div className="p-6 flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-red-400 text-sm">{ordersError || 'Order not found'}</p>
          <Link href="/reseller/orders">
            <GlassButton variant="secondary" size="sm">
              <ArrowLeft size={16} /> Back to Orders
            </GlassButton>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title={order.orderNumber} subtitle={order.service?.name || 'Order Details'} />

      <div className="p-6 space-y-6">
        {/* Back + Status */}
        <motion.div className="flex items-center justify-between" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <Link
            href="/reseller/orders"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
          >
            <ArrowLeft size={16} /> Back to Orders
          </Link>
          <StatusBadge status={order.status} />
        </motion.div>

        {/* Order Information */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <GlassCard>
            <h3 className="font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
              <Clock size={16} className="text-[var(--accent)]" /> Order Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3 rounded-xl bg-white/5">
                <p className="text-xs text-[var(--muted)] mb-1">Order ID</p>
                <p className="text-sm font-mono font-medium text-[var(--foreground)]">{order.orderNumber}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5">
                <p className="text-xs text-[var(--muted)] mb-1">Status</p>
                <StatusBadge status={order.status} />
              </div>
              {order.priority && (
                <div className="p-3 rounded-xl bg-white/5">
                  <p className="text-xs text-[var(--muted)] mb-1">Priority</p>
                  <p className="text-sm font-medium text-[var(--foreground)] capitalize">{order.priority}</p>
                </div>
              )}
              <div className="p-3 rounded-xl bg-white/5">
                <p className="text-xs text-[var(--muted)] mb-1">Created</p>
                <p className="text-sm text-[var(--foreground)]">{formatDate(order.createdAt)}</p>
              </div>
              {order.completedAt && (
                <div className="p-3 rounded-xl bg-white/5">
                  <p className="text-xs text-[var(--muted)] mb-1">Completed</p>
                  <p className="text-sm text-[var(--foreground)]">{formatDate(order.completedAt)}</p>
                </div>
              )}
              {order.processingTime && (
                <div className="p-3 rounded-xl bg-white/5">
                  <p className="text-xs text-[var(--muted)] mb-1">Processing Time</p>
                  <p className="text-sm text-[var(--foreground)]">{order.processingTime}</p>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Service Information */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard>
            <h3 className="font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
              <Smartphone size={16} className="text-[var(--accent)]" /> Service Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-white/5">
                <p className="text-xs text-[var(--muted)] mb-1">Service Name</p>
                <p className="text-sm font-medium text-[var(--foreground)]">{order.service?.name || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5">
                <p className="text-xs text-[var(--muted)] mb-1">Type</p>
                <p className="text-sm text-[var(--foreground)]">{order.service?.type || 'N/A'}</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* IMEI / Device Information */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <GlassCard>
            <h3 className="font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
              <Smartphone size={16} className="text-[var(--accent)]" /> Device Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-white/5">
                <p className="text-xs text-[var(--muted)] mb-1">IMEI</p>
                <p className="text-sm font-mono font-medium text-[var(--foreground)]">{order.imei || '—'}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5">
                <p className="text-xs text-[var(--muted)] mb-1">Device Info</p>
                <p className="text-sm text-[var(--foreground)]">{order.deviceInfo || 'N/A'}</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Pricing */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard>
            <h3 className="font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
              <CreditCard size={16} className="text-[var(--accent)]" /> Pricing
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-white/5">
                <p className="text-xs text-[var(--muted)] mb-1">Selling Price</p>
                <p className="text-lg font-bold text-[var(--foreground)]">${order.sellingPrice?.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5">
                <p className="text-xs text-[var(--muted)] mb-1">Payment Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm text-green-400 font-medium">Deducted from wallet</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Admin Reply */}
        {order.notes && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <GlassCard className="border-indigo-500/10">
              <h3 className="font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
                <MessageSquareText size={16} className="text-indigo-400" /> Admin Notes
              </h3>
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/15">
                <p className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">{order.notes}</p>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Order Timeline */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <GlassCard>
            <h3 className="font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-[var(--accent)]" /> Order Timeline
            </h3>
            {timeline.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-[var(--muted)] text-sm">No timeline events available</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-indigo-500/40 via-purple-500/30 to-transparent" />
                <div className="space-y-5">
                  {timeline.map((event, idx) => {
                    const isNote = event.action === 'note' || event.type === 'note'

                    return (
                      <div key={event.id} className="flex gap-4 relative">
                        <div className="flex-shrink-0 mt-0.5 relative z-10">
                          {isNote ? (
                            <div className="w-[15px] h-[15px] rounded-full bg-indigo-500/30 border-2 border-indigo-500 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                            </div>
                          ) : (
                            <div className={`w-[15px] h-[15px] rounded-full border-2 flex items-center justify-center ${
                              idx === 0 ? 'bg-green-500/30 border-green-500' : 'bg-white/10 border-white/30'
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                idx === 0 ? 'bg-green-400' : 'bg-white/50'
                              }`} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <div className={`p-3 rounded-xl ${
                            isNote
                              ? 'bg-indigo-500/8 border border-indigo-500/10'
                              : 'bg-white/5'
                          }`}>
                            <p className="text-sm font-medium text-[var(--foreground)] capitalize">
                              {event.description || event.action.replace(/_/g, ' ')}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-xs text-[var(--muted)]">{formatDate(event.createdAt)}</span>
                              {event.author && (
                                <span className="text-xs text-[var(--muted)]">by {event.author}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </div>
  )
}
