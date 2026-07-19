'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassDropdown } from '@/components/ui/GlassDropdown'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { StatCard } from '@/components/ui/StatCard'
import { useApi } from '@/hooks/useApi'
import { useToast } from '@/components/ui/Toast'
import { motion } from 'framer-motion'
import {
  Search, Loader2, X, CheckCircle, XCircle, Trash2,
  Package, Clock, AlertCircle, CheckCheck,
} from 'lucide-react'
import { useState, useMemo } from 'react'

interface SupplierServiceItem {
  id: string
  supplierServiceId: string
  name: string
  category: string | null
  supplierCost: number
  currency: string
  deliveryTime: string | null
  requiredInputs: string | null
  status: string
  providerId: string
  provider: { id: string; name: string }
  createdAt: string
}

interface SupplierItem {
  id: string
  name: string
}

interface CategoryItem {
  id: string
  name: string
}

interface ApiResponse {
  services: SupplierServiceItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'ignored', label: 'Ignored' },
  { value: 'disabled', label: 'Disabled' },
]

export default function ImportServicesPage() {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [providerFilter, setProviderFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [approveModal, setApproveModal] = useState<SupplierServiceItem | null>(null)
  const [approveForm, setApproveForm] = useState({
    sellingPrice: '',
    profitType: 'fixed' as 'fixed' | 'percentage',
    profitValue: '',
    categoryId: '',
    clientVisible: true,
  })
  const [approving, setApproving] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [bulkAction, setBulkAction] = useState<string | null>(null)

  const params = useMemo(() => {
    const p = new URLSearchParams()
    if (providerFilter) p.set('providerId', providerFilter)
    if (statusFilter) p.set('status', statusFilter)
    if (search) p.set('search', search)
    if (categoryFilter) p.set('category', categoryFilter)
    p.set('page', String(page))
    p.set('limit', '50')
    return p.toString()
  }, [providerFilter, statusFilter, search, categoryFilter, page])

  const { data, loading, refetch } = useApi<ApiResponse>({ url: `/api/supplier-services?${params}` })
  const { data: providersData } = useApi<{ suppliers: SupplierItem[] }>({ url: '/api/suppliers' })
  const { data: catData } = useApi<{ categories: CategoryItem[] }>({ url: '/api/service-categories' })

  const providers = providersData?.suppliers || []
  const categories = catData?.categories || []

  const allCategories = useMemo(() => {
    const items = data?.services || []
    const cats = new Set<string>()
    items.forEach((s) => { if (s.category) cats.add(s.category) })
    ;(catData?.categories || []).forEach((c) => cats.add(c.name))
    return Array.from(cats).sort()
  }, [data?.services, catData?.categories])

  const services = data?.services || []
  const allSelected = services.length > 0 && services.every((s) => selectedIds.has(s.id))

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) services.forEach((s) => next.delete(s.id))
      else services.forEach((s) => next.add(s.id))
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

  const runBulkAction = async (action: 'approve' | 'ignore' | 'disable') => {
    if (selectedIds.size === 0) return
    setBulkAction(action)
    try {
      const res = await fetch('/api/supplier-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), action }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast('success', `${selectedIds.size} services ${action === 'approve' ? 'approved' : action + 'd'}`)
      setSelectedIds(new Set())
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Bulk action failed')
    } finally {
      setBulkAction(null)
    }
  }

  const openApproveModal = (service: SupplierServiceItem) => {
    const defaultPrice = service.supplierCost * 1.5
    setApproveModal(service)
    setApproveForm({
      sellingPrice: defaultPrice.toFixed(2),
      profitType: 'fixed',
      profitValue: (defaultPrice - service.supplierCost).toFixed(2),
      categoryId: '',
      clientVisible: true,
    })
  }

  const recalcPreview = (field: string, value: string) => {
    const updated = { ...approveForm, [field]: value }
    const cost = approveModal?.supplierCost || 0
    if (field === 'sellingPrice') {
      const sp = parseFloat(value) || 0
      const diff = sp - cost
      if (diff >= 0) {
        updated.profitType = 'fixed'
        updated.profitValue = diff.toFixed(2)
      }
    } else if (field === 'profitType' || field === 'profitValue') {
      const pv = parseFloat(updated.profitValue) || 0
      if (updated.profitType === 'fixed') {
        updated.sellingPrice = (cost + pv).toFixed(2)
      } else {
        updated.sellingPrice = (cost * (1 + pv / 100)).toFixed(2)
      }
    }
    setApproveForm(updated)
  }

  const handleApprove = async () => {
    if (!approveModal) return
    setApproving(true)
    try {
      const res = await fetch(`/api/supplier-services/${approveModal.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellingPrice: parseFloat(approveForm.sellingPrice) || undefined,
          profitType: approveForm.profitType,
          profitValue: parseFloat(approveForm.profitValue) || 0,
          categoryId: approveForm.categoryId || null,
          clientVisible: approveForm.clientVisible,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast('success', `Service approved — selling price $${parseFloat(approveForm.sellingPrice).toFixed(2)}`)
      setApproveModal(null)
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed to approve')
    } finally {
      setApproving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(confirmDelete.id)
    try {
      const res = await fetch(`/api/supplier-services/${confirmDelete.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast('success', 'Service deleted')
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeleting(null)
      setConfirmDelete(null)
    }
  }

  const handleIgnore = async (service: SupplierServiceItem) => {
    try {
      const res = await fetch('/api/supplier-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [service.id], action: 'ignore' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast('success', 'Service ignored')
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
    }
  }

  const requiredInputsList = (raw: string | null): string[] => {
    if (!raw) return []
    try { return JSON.parse(raw) } catch { return [] }
  }

  return (
    <div>
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Service"
        message={`Delete imported service "${confirmDelete?.name}"? This cannot be undone.`}
        variant="danger"
        loading={!!deleting}
      />

      <Header title="Import Services" subtitle="Review and approve supplier services" />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total" value={data?.total || 0} icon={Package} color="indigo" />
          <StatCard title="Pending" value={services.filter((s) => s.status === 'pending').length} icon={Clock} color="amber" />
          <StatCard title="Approved" value={services.filter((s) => s.status === 'approved').length} icon={CheckCheck} color="green" />
          <StatCard title="Ignored" value={services.filter((s) => s.status === 'ignored').length} icon={AlertCircle} color="red" />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              className="glass-input pl-9 w-full"
              placeholder="Search services..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <GlassDropdown
            options={[{ value: '', label: 'All Suppliers' }, ...providers.map((p: SupplierItem) => ({ value: p.id, label: p.name }))]}
            value={providerFilter}
            onChange={(v) => { setProviderFilter(v); setPage(1) }}
            size="sm"
            className="w-auto"
          />
          <GlassDropdown
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1) }}
            size="sm"
            className="w-auto"
          />
          <GlassDropdown
            options={[{ value: '', label: 'All Categories' }, ...allCategories.map((c) => ({ value: c, label: c }))]}
            value={categoryFilter}
            onChange={(v) => { setCategoryFilter(v); setPage(1) }}
            size="sm"
            className="w-auto"
          />
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <GlassCard padding="p-3" className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-[var(--foreground)]">{selectedIds.size} selected</span>
            <div className="flex-1" />
            <GlassButton size="sm" onClick={() => runBulkAction('approve')} disabled={!!bulkAction}>
              {bulkAction === 'approve' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              Bulk Approve
            </GlassButton>
            <GlassButton size="sm" variant="secondary" onClick={() => runBulkAction('ignore')} disabled={!!bulkAction}>
              {bulkAction === 'ignore' ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
              Bulk Ignore
            </GlassButton>
            <GlassButton size="sm" variant="danger" onClick={() => runBulkAction('disable')} disabled={!!bulkAction}>
              {bulkAction === 'disable' ? <Loader2 size={14} className="animate-spin" /> : <AlertCircle size={14} />}
              Bulk Disable
            </GlassButton>
            <GlassButton size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              <span className="text-lg">&times;</span>
            </GlassButton>
          </GlassCard>
        )}

        {/* Table */}
        <GlassCard padding="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="w-10 py-3 px-4">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="rounded" />
                  </th>
                  <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Service Name</th>
                  <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Supplier</th>
                  <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Category</th>
                  <th className="text-right py-3 px-4 text-[var(--muted)] font-medium">Cost</th>
                  <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Delivery</th>
                  <th className="text-center py-3 px-4 text-[var(--muted)] font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-[var(--muted)] font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <Loader2 size={24} className="animate-spin mx-auto text-[var(--muted)]" />
                    </td>
                  </tr>
                ) : services.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <Package size={40} className="mx-auto text-[var(--muted)] mb-3 opacity-50" />
                      <p className="text-[var(--muted)] text-sm">No imported services found</p>
                      <p className="text-[var(--muted)] text-xs mt-1">Sync your suppliers to import services</p>
                    </td>
                  </tr>
                ) : (
                  services.map((service: SupplierServiceItem, i: number) => {
                    const isSel = selectedIds.has(service.id)
                    const inputs = requiredInputsList(service.requiredInputs)
                    return (
                      <motion.tr
                        key={service.id}
                        className={`border-b border-[var(--card-border)] hover:bg-white/5 transition-colors ${isSel ? 'bg-[var(--accent)]/5' : ''}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                      >
                        <td className="py-3 px-4">
                          <input type="checkbox" checked={isSel} onChange={() => toggleSelect(service.id)} className="rounded" />
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-[var(--foreground)] font-medium">{service.name}</div>
                          <div className="text-xs text-[var(--muted)] font-mono">{service.supplierServiceId}</div>
                          {inputs.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {inputs.map((inp) => (
                                <span key={inp} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[var(--muted)]">{inp}</span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[var(--foreground)]">{service.provider?.name || '—'}</td>
                        <td className="py-3 px-4">
                          {service.category ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400">{service.category}</span>
                          ) : (
                            <span className="text-[var(--muted)]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-[var(--foreground)] font-medium">${service.supplierCost.toFixed(2)}</span>
                          <span className="text-[var(--muted)] text-xs ml-1">{service.currency}</span>
                        </td>
                        <td className="py-3 px-4 text-[var(--foreground)] text-xs">{service.deliveryTime || '—'}</td>
                        <td className="py-3 px-4 text-center"><StatusBadge status={service.status} /></td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            {service.status === 'pending' && (
                              <>
                                <button
                                  title="Approve"
                                  onClick={() => openApproveModal(service)}
                                  className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                >
                                  <CheckCircle size={14} />
                                </button>
                                <button
                                  title="Ignore"
                                  onClick={() => handleIgnore(service)}
                                  className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/10 transition-colors"
                                >
                                  <XCircle size={14} />
                                </button>
                              </>
                            )}
                            {service.status !== 'approved' && (
                              <button
                                title="Delete"
                                onClick={() => setConfirmDelete({ id: service.id, name: service.name })}
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                                disabled={deleting === service.id}
                              >
                                {deleting === service.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--card-border)]">
              <span className="text-xs text-[var(--muted)]">
                Page {data.page} of {data.totalPages} ({data.total} services)
              </span>
              <div className="flex gap-2">
                <GlassButton size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Prev
                </GlassButton>
                <GlassButton size="sm" variant="secondary" disabled={page >= data.totalPages} onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}>
                  Next
                </GlassButton>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Approve Modal */}
        {approveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
              className="glass p-6 w-full max-w-lg mx-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--foreground)]">Approve Service</h3>
                <button onClick={() => setApproveModal(null)} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                  <X size={20} />
                </button>
              </div>

              <div className="mb-4 p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
                <div className="text-sm font-medium text-[var(--foreground)]">{approveModal.name}</div>
                <div className="text-xs text-[var(--muted)] mt-0.5">
                  {approveModal.provider?.name} &middot; {approveModal.category || 'Uncategorized'}
                </div>
                {approveModal.deliveryTime && (
                  <div className="text-xs text-[var(--muted)] mt-0.5">Delivery: {approveModal.deliveryTime}</div>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[var(--muted)] mb-1">Supplier Cost</label>
                    <div className="glass-input w-full flex items-center gap-1 pointer-events-none opacity-70">
                      <span className="text-[var(--muted)]">$</span>
                      <span>{approveModal.supplierCost.toFixed(2)}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--muted)] mb-1">Selling Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">$</span>
                      <input
                        className="glass-input w-full pl-7"
                        type="number"
                        step="0.01"
                        min="0"
                        value={approveForm.sellingPrice}
                        onChange={(e) => recalcPreview('sellingPrice', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[var(--muted)] mb-1">Profit Type</label>
                    <GlassDropdown
                      options={[
                        { value: 'fixed', label: 'Fixed ($)' },
                        { value: 'percentage', label: 'Percentage (%)' },
                      ]}
                      value={approveForm.profitType}
                      onChange={(v) => recalcPreview('profitType', v)}
                      size="sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--muted)] mb-1">Profit Value</label>
                    <input
                      className="glass-input w-full"
                      type="number"
                      step="0.01"
                      min="0"
                      value={approveForm.profitValue}
                      onChange={(e) => recalcPreview('profitValue', e.target.value)}
                    />
                  </div>
                </div>

                {/* Profit Preview */}
                {approveForm.sellingPrice && (
                  <div className="p-3 rounded-xl bg-white/5 text-sm">
                    <span className="text-[var(--muted)]">Profit: </span>
                    <span className="font-bold text-green-500">
                      ${(parseFloat(approveForm.sellingPrice) - approveModal.supplierCost).toFixed(2)}
                    </span>
                    <span className="text-[var(--muted)] ml-2">
                      ({((parseFloat(approveForm.sellingPrice) / Math.max(approveModal.supplierCost, 0.01) - 1) * 100).toFixed(1)}% markup)
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1">Category</label>
                  <GlassDropdown
                    options={[
                      { value: '', label: 'No Category' },
                      ...categories.map((c: CategoryItem) => ({ value: c.id, label: c.name })),
                    ]}
                    value={approveForm.categoryId}
                    onChange={(v) => setApproveForm({ ...approveForm, categoryId: v })}
                  />
                </div>

                <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-[var(--card-border)] cursor-pointer hover:bg-white/8 transition-colors">
                  <input
                    type="checkbox"
                    checked={approveForm.clientVisible}
                    onChange={(e) => setApproveForm({ ...approveForm, clientVisible: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <div>
                    <span className="text-sm font-medium text-[var(--foreground)]">Visible to Clients</span>
                    <p className="text-xs text-[var(--muted)]">Clients can see and order this service</p>
                  </div>
                </label>

                <div className="flex gap-3 pt-2">
                  <GlassButton variant="secondary" className="flex-1" onClick={() => setApproveModal(null)}>
                    Cancel
                  </GlassButton>
                  <GlassButton className="flex-1" onClick={handleApprove} disabled={approving}>
                    {approving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    Approve &amp; Publish
                  </GlassButton>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
