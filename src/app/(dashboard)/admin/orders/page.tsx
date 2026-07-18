'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassDropdown, DropdownOption } from '@/components/ui/GlassDropdown'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { StatCard } from '@/components/ui/StatCard'
import { useApi } from '@/hooks/useApi'
import { useToast } from '@/components/ui/Toast'
import { OrderDetailDrawer, DetailOrder } from '@/components/admin/OrderDetailDrawer'
import { motion } from 'framer-motion'
import {
  Search, Eye, Pencil, MessageSquare, FileText, Copy, Trash2, Download,
  ChevronUp, Loader2, Smartphone, DollarSign,
  Clock, Package, AlertCircle, CheckCircle2, RefreshCw, Send,
} from 'lucide-react'
import { useState, useEffect } from 'react'

const STATUS_OPTIONS: DropdownOption[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'refunded', label: 'Refunded' },
]

const SIDEBAR_GROUPS: { items: { key: string; label: string }[] }[] = [
  {
    items: [
      { key: 'all', label: 'All Orders' },
      { key: 'new', label: 'New Orders' },
      { key: 'pending', label: 'Pending' },
      { key: 'processing', label: 'In Progress' },
      { key: 'completed', label: 'Completed' },
      { key: 'rejected', label: 'Rejected' },
      { key: 'refunded', label: 'Refunded' },
      { key: 'cancelled', label: 'Cancelled' },
    ],
  },
  {
    items: [
      { key: 'high', label: 'High Priority' },
      { key: 'today', label: 'Today' },
      { key: 'yesterday', label: 'Yesterday' },
      { key: 'week', label: 'This Week' },
      { key: 'month', label: 'This Month' },
    ],
  },
]

interface OrderItem {
  id: string
  orderNumber: string
  status: string
  priority?: string
  imei?: string | null
  deviceInfo?: string | null
  sellingPrice?: number
  createdAt: string
  service?: { name: string; type?: string }
  user?: { name: string; email: string }
}

interface Summary {
  total: number
  counts: Record<string, number>
  todayRevenue: number
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec} sec ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hr ago`
  const day = Math.floor(hr / 24)
  return `${day} day${day > 1 ? 's' : ''} ago`
}

export default function OrdersPage() {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sidebarFilter, setSidebarFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [viewOrder, setViewOrder] = useState<DetailOrder | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const { data: summary } = useApi<Summary>({ url: '/api/orders/summary' })
  const { data, loading, refetch } = useApi<{ orders: OrderItem[]; pagination: { page: number; limit: number; total: number; pages: number } }>({
    url: `/api/orders?status=${statusFilter === 'ALL' ? '' : statusFilter}&page=${page}&limit=25`,
  })
  const { data: adminUsersData } = useApi<{ users: { id: string; name: string }[] }>({ url: '/api/users?role=admin' })
  const adminUsers = adminUsersData?.users || []

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const orderId = params.get('order')
    if (orderId) {
      loadDetail(orderId)
      window.history.replaceState({}, '', '/orders')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const allOrders = data?.orders || []
  const pagination = data?.pagination

  const isSameDay = (d: Date, ref: Date) =>
    d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate()

  const matchesSidebar = (o: OrderItem): boolean => {
    const now = new Date()
    const created = new Date(o.createdAt)
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    const weekAgo = new Date(now)
    weekAgo.setDate(now.getDate() - 7)
    const monthAgo = new Date(now)
    monthAgo.setMonth(now.getMonth() - 1)
    switch (sidebarFilter) {
      case 'new':
      case 'pending':
      case 'processing':
      case 'completed':
      case 'rejected':
      case 'refunded':
      case 'cancelled':
        return o.status === sidebarFilter
      case 'high':
        return (o.priority || 'normal') === 'high' || (o.priority || 'normal') === 'urgent'
      case 'today':
        return isSameDay(created, now)
      case 'yesterday':
        return isSameDay(created, yesterday)
      case 'week':
        return created >= weekAgo
      case 'month':
        return created >= monthAgo
      default:
        return true
    }
  }

  const filtered = allOrders.filter((o: OrderItem) => {
    if (!matchesSidebar(o)) return false
    const s = search.toLowerCase()
    if (!s) return true
    return (
      o.orderNumber.toLowerCase().includes(s) ||
      o.imei?.toLowerCase().includes(s) ||
      o.deviceInfo?.toLowerCase().includes(s) ||
      o.user?.name?.toLowerCase().includes(s) ||
      o.user?.email?.toLowerCase().includes(s) ||
      o.service?.name?.toLowerCase().includes(s)
    )
  })

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

  const allSelected = filtered.length > 0 && filtered.every((o) => selectedIds.has(o.id))
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) filtered.forEach((o) => next.delete(o.id))
      else filtered.forEach((o) => next.add(o.id))
      return next
    })
  }
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const runBulk = async (action: 'delete' | 'status' | 'assign' | 'refund', extra?: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/orders/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), action, ...extra }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast('success', `Updated ${json.affected} orders`)
      setSelectedIds(new Set())
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Bulk action failed')
    }
  }

  const copyId = (id: string) => {
    navigator.clipboard?.writeText(id)
    toast('success', 'Order ID copied')
  }

  const exportCsv = () => {
    const rows = filtered.map((o) => [o.orderNumber, o.user?.name || '', o.service?.name || '', o.imei || '', o.status, o.sellingPrice || '', o.createdAt])
    const csv = [['Order ID', 'User', 'Service', 'IMEI/SN', 'Status', 'Price', 'Date'], ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'orders.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <Header title="Orders" subtitle={summary ? `${summary.total.toLocaleString()} total orders` : 'Loading...'} />

      <div className="px-6 pt-2">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard title="Total Orders" value={summary?.total.toLocaleString() || '0'} icon={Package} color="indigo" />
          <StatCard title="Pending" value={summary?.counts?.pending?.toLocaleString() || '0'} icon={Clock} color="amber" />
          <StatCard title="In Progress" value={summary?.counts?.processing?.toLocaleString() || '0'} icon={RefreshCw} color="blue" />
          <StatCard title="Completed" value={summary?.counts?.completed?.toLocaleString() || '0'} icon={CheckCircle2} color="green" />
          <StatCard title="Rejected" value={(summary?.counts?.rejected || 0) + (summary?.counts?.failed || 0)} icon={AlertCircle} color="red" />
          <StatCard title="Today's Revenue" value={`$${(summary?.todayRevenue || 0).toLocaleString()}`} icon={DollarSign} color="purple" />
        </div>
      </div>

      <div className="p-6 flex gap-6">
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-24 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] px-3 mb-2">Orders</p>
            {SIDEBAR_GROUPS.map((group, gi) => (
              <div key={gi} className={gi > 0 ? 'pt-3 mt-3 border-t border-[var(--card-border)]' : ''}>
                {group.items.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      const statusGroup = ['new', 'pending', 'processing', 'completed', 'rejected', 'refunded', 'cancelled']
                      setStatusFilter(statusGroup.includes(item.key) ? (item.key === 'new' ? 'pending' : item.key) : 'ALL')
                      setSidebarFilter(item.key)
                      setPage(1)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                      sidebarFilter === item.key
                        ? 'bg-[var(--accent)]/15 text-[var(--foreground)] font-medium'
                        : 'text-[var(--muted)] hover:bg-white/5 hover:text-[var(--foreground)]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>

        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input className="glass-input pl-9 w-full" placeholder="Search Order ID, User, IMEI, Service..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <GlassDropdown
              options={[{ value: 'ALL', label: 'All Status' }, ...STATUS_OPTIONS]}
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setPage(1) }}
              size="sm"
            />
          </div>

          {selectedIds.size > 0 && (
            <GlassCard padding="p-3" className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-[var(--foreground)]">{selectedIds.size} selected</span>
              <div className="flex-1" />
              <GlassButton size="sm" variant="secondary" onClick={exportCsv}><Download size={14} /> Export</GlassButton>
              <GlassDropdown size="sm" options={[{ value: '', label: 'Change Status' }, ...STATUS_OPTIONS]} value="" onChange={(v) => v && runBulk('status', { status: v })} />
              <GlassDropdown size="sm" options={[{ value: '', label: 'Assign Staff' }, { value: 'none', label: 'Unassign' }, ...adminUsers.map((u) => ({ value: u.id, label: u.name }))]} value="" onChange={(v) => runBulk('assign', { assignedTo: v === 'none' ? null : v })} />
              <GlassButton size="sm" variant="secondary" onClick={() => runBulk('refund')}><DollarSign size={14} /> Refund</GlassButton>
              <GlassButton size="sm" variant="danger" onClick={() => runBulk('delete')}><Trash2 size={14} /> Delete</GlassButton>
              <GlassButton size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}><span className="text-lg">×</span></GlassButton>
            </GlassCard>
          )}

          <GlassCard padding="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--card-border)]">
                    <th className="w-10 py-4 px-4"><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="rounded" /></th>
                    <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Order ID</th>
                    <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">User</th>
                    <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Service</th>
                    <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">IMEI/SN</th>
                    <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Status</th>
                    <th className="text-right py-4 px-4 text-[var(--muted)] font-medium">Price</th>
                    <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Date</th>
                    <th className="text-right py-4 px-4 text-[var(--muted)] font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((order: OrderItem, i: number) => {
                    const isSel = selectedIds.has(order.id)
                    return (
                      <motion.tr
                        key={order.id}
                        className={`border-b border-[var(--card-border)] hover:bg-white/5 transition-colors cursor-pointer ${isSel ? 'bg-[var(--accent)]/5' : ''}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => loadDetail(order.id)}
                      >
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={isSel} onChange={() => toggleSelect(order.id)} className="rounded" />
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-[var(--foreground)]">{order.orderNumber}</td>
                        <td className="py-3 px-4 text-[var(--foreground)]">{order.user?.name || 'N/A'}</td>
                        <td className="py-3 px-4 text-[var(--foreground)]">{order.service?.name || 'N/A'}</td>
                        <td className="py-3 px-4 font-mono text-xs text-[var(--muted)]">{order.imei || order.deviceInfo || '—'}</td>
                        <td className="py-3 px-4"><StatusBadge status={order.status} /></td>
                        <td className="py-3 px-4 text-right font-medium text-[var(--foreground)]">${(order.sellingPrice || 0).toFixed(2)}</td>
                        <td className="py-3 px-4 text-xs text-[var(--muted)]">{timeAgo(order.createdAt)}</td>
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <RowAction icon={<Eye size={14} />} title="View" onClick={() => loadDetail(order.id)} />
                            <RowAction icon={<Pencil size={14} />} title="Edit" onClick={() => loadDetail(order.id)} />
                            <RowAction icon={<Copy size={14} />} title="Copy ID" onClick={() => copyId(order.orderNumber)} />
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-[var(--muted)]">
                        {loading ? <Loader2 size={24} className="animate-spin mx-auto text-[var(--accent)]" /> : 'No orders found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--card-border)]">
                <span className="text-xs text-[var(--muted)]">Page {pagination.page} of {pagination.pages} ({pagination.total} orders)</span>
                <div className="flex gap-2">
                  <GlassButton size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</GlassButton>
                  <GlassButton size="sm" variant="secondary" disabled={page >= pagination.pages} onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}>Next</GlassButton>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      <OrderDetailDrawer
        open={!!viewOrder}
        onClose={() => setViewOrder(null)}
        order={viewOrder}
        loading={detailLoading}
        adminUsers={adminUsers}
        onUpdate={() => { if (viewOrder) loadDetail(viewOrder.id); refetch() }}
      />
    </div>
  )
}

function RowAction({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button title={title} onClick={onClick} className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/10 transition-colors">
      {icon}
    </button>
  )
}
