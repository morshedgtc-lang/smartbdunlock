'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassDropdown } from '@/components/ui/GlassDropdown'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { AlertModal } from '@/components/ui/ConfirmDialog'
import { useApi } from '@/hooks/useApi'
import { useToast } from '@/components/ui/Toast'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'

const OrderDetailDrawer = dynamic(() => import('@/components/admin/OrderDetailDrawer').then(m => ({ default: m.OrderDetailDrawer })), { ssr: false })
type DetailOrder = import('@/components/admin/OrderDetailDrawer').DetailOrder
import { Plus, Search, Loader2, X, Smartphone, Upload, AlertCircle, ArrowRight, Package, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'

const STATUS_STEPS = ['pending', 'processing', 'completed']
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500', processing: 'bg-blue-500', completed: 'bg-green-500',
  failed: 'bg-red-500', cancelled: 'bg-gray-500', rejected: 'bg-red-600', refunded: 'bg-purple-500',
}

interface ServiceItem {
  id: string
  name: string
  status: string
  cost: number
  sellingPrice: number
  processingTime?: string
  type: string
  customFields?: CustomField[]
}

interface CustomField {
  id: string
  fieldType: string
  label: string
  placeholder?: string
  options?: string | string[]
  required: boolean
  visibleToClient: boolean
  previewImage?: boolean
}

interface OrderItem {
  id: string
  orderNumber: string
  status: string
  imei?: string
  deviceInfo?: string
  sellingPrice?: number
  createdAt: string
  notes?: string
  result?: string
  processingTime?: string
  completedAt?: string
  service?: { name: string }
  customValues?: { value?: string | null; label?: string; fieldType?: string }[]
}

interface WalletData {
  balance: number
}

function resolveImei(o: OrderItem): string {
  if (o.imei || o.deviceInfo) return o.imei || o.deviceInfo || ''
  const cv = (o.customValues || []).find(
    (v) => v.fieldType === 'imei_single' || (v.label || '').toLowerCase().includes('imei'),
  )
  return cv?.value || ''
}

export default function ClientOrdersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [orderForm, setOrderForm] = useState({ serviceId: '', notes: '' })
  const [customValues, setCustomValues] = useState<Record<string, string>>({})
  const [imeiCount, setImeiCount] = useState<Record<string, number>>({})
  const [alertState, setAlertState] = useState<{ title: string; message: string } | null>(null)
  const [viewOrder, setViewOrder] = useState<DetailOrder | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const { toast } = useToast()
  const { data, loading, error, refetch } = useApi<{ orders: OrderItem[] }>({ url: '/api/orders' })
  const { data: servicesData } = useApi<{ services: ServiceItem[] }>({ url: '/api/services' })
  const { data: walletData } = useApi<WalletData>({ url: '/api/wallet' })
  const allOrders = data?.orders || []
  const services = servicesData?.services || []
  const balance = walletData?.balance ?? 0

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const orderId = params.get('order')
    const status = params.get('status')
    if (orderId) {
      loadDetail(orderId)
      window.history.replaceState({}, '', '/reseller/orders')
    }
    if (status) setStatusFilter(status.toUpperCase())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = allOrders.filter((o: OrderItem) => {
    const matchSearch = o.orderNumber.toLowerCase().includes(search.toLowerCase()) || o.imei?.toLowerCase().includes(search.toLowerCase()) || o.service?.name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'ALL' || o.status.toUpperCase() === statusFilter
    return matchSearch && matchStatus
  })

  const selectedService = services.find((s: ServiceItem) => s.id === orderForm.serviceId)
  const customFields = selectedService?.customFields?.filter((f: CustomField) => f.visibleToClient) || []

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

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderForm.serviceId) { toast('error', 'Please select a service'); return }
    setCreating(true)
    try {
      const finalValues = { ...customValues }
      const svc = services.find((s: ServiceItem) => s.id === orderForm.serviceId)
      for (const field of svc?.customFields || []) {
        if ((field.fieldType === 'file' || field.fieldType === 'image') && field.previewImage && finalValues[field.id]?.startsWith('data:')) {
          try {
            const res = await fetch('/api/upload/imgbb', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: finalValues[field.id] }),
            })
            const data = await res.json()
            if (res.ok && data.url) finalValues[field.id] = data.url
          } catch { /* keep base64 as fallback */ }
        }
      }
      const body: { serviceId: string; notes?: string; customFieldValues: Record<string, string> } = { serviceId: orderForm.serviceId, notes: orderForm.notes || undefined, customFieldValues: finalValues }
      const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast('success', `Order ${data.orderNumber} created`)
      setShowCreate(false)
      setOrderForm({ serviceId: '', notes: '' })
      setCustomValues({})
      setImeiCount({})
      refetch()
    } catch (err: unknown) { toast('error', err instanceof Error ? err.message : 'Failed') } finally { setCreating(false) }
  }

  const updateCustomValue = (fieldId: string, value: string) => setCustomValues(prev => ({ ...prev, [fieldId]: value }))

  const handleImeiMultiInput = (fieldId: string, rawValue: string) => {
    const lines = rawValue.split('\n')
    const cleaned = lines.map(l => l.replace(/\D/g, '').trim()).filter(Boolean)
    const unique = [...new Set(cleaned)]
    setImeiCount(prev => ({ ...prev, [fieldId]: unique.length }))
    updateCustomValue(fieldId, rawValue)
  }

  if (loading) {
    return (
      <div>
        <Header title="My Orders" subtitle="Loading..." />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Header title="My Orders" />
        <div className="p-6 flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-red-400 text-sm">{error}</p>
          <Link href="/login" className="text-[var(--accent)] text-sm hover:underline">Go to Login</Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <AlertModal open={!!alertState} onClose={() => setAlertState(null)} title={alertState?.title || ''} message={alertState?.message || ''} variant="warning" />
      <Header title="My Orders" subtitle={`${allOrders.length} orders`} />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input className="glass-input pl-9 w-64" placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {['ALL', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'].map(s => (
                <button key={s} className={`filter-pill ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                  {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          <Link href="/reseller/services">
            <GlassButton size="sm">
              <Plus size={16} /> New Order
            </GlassButton>
          </Link>
        </div>

        {/* Create Order Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div className="glass p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--foreground)]">Create New Order</h3>
                <button onClick={() => { setShowCreate(false); setCustomValues({}); setImeiCount({}) }} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                  <X size={20} />
                </button>
              </div>
              <div className="mb-4 p-3 rounded-xl bg-white/5">
                <p className="text-sm text-[var(--muted)]">Your Balance</p>
                <p className="text-xl font-bold text-[var(--foreground)]">${balance.toLocaleString()}</p>
              </div>
              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Service *</label>
                  <GlassDropdown
                    options={[{ value: '', label: 'Select a service...' }, ...services.filter((s: ServiceItem) => s.status === 'active').map((service: ServiceItem) => ({ value: service.id, label: `${service.name} — $${service.sellingPrice} (${service.processingTime || 'N/A'})` }))]}
                    value={orderForm.serviceId}
                    onChange={(v) => { setOrderForm({ ...orderForm, serviceId: v }); setCustomValues({}); setImeiCount({}) }}
                  />
                </div>
                {selectedService && (
                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Smartphone size={16} className="text-indigo-500" />
                      <span className="text-sm font-medium text-[var(--foreground)]">{selectedService.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-[var(--muted)]">
                      <span>Cost: ${selectedService.cost}</span>
                      <span>Price: ${selectedService.sellingPrice}</span>
                      <span>Processing: {selectedService.processingTime || 'N/A'}</span>
                      <span>Type: {selectedService.type}</span>
                    </div>
                  </div>
                )}
                {customFields.length > 0 && (
                  <div className="space-y-4 border-t border-[var(--card-border)] pt-4">
                    <p className="text-sm font-medium text-[var(--foreground)]">Required Information</p>
                    {customFields.map((field: CustomField) => (
                      <CustomFieldInput key={field.id} field={field} value={customValues[field.id] || ''} onChange={(val) => updateCustomValue(field.id, val)} onImeiMultiChange={(val) => handleImeiMultiInput(field.id, val)} imeiCount={imeiCount[field.id] || 0} onAlert={setAlertState} />
                    ))}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Notes</label>
                  <textarea className="glass-input w-full h-20 resize-none" placeholder="Additional notes for this order..." value={orderForm.notes} onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })} />
                </div>
                {selectedService && (
                  <div className="p-3 rounded-xl bg-white/5">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--muted)]">Amount to be charged</span>
                      <span className="font-bold text-[var(--foreground)]">${selectedService.sellingPrice}</span>
                    </div>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <GlassButton type="button" variant="secondary" className="flex-1" onClick={() => { setShowCreate(false); setCustomValues({}); setImeiCount({}) }}>Cancel</GlassButton>
                  <GlassButton type="submit" className="flex-1" disabled={creating}>
                    {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Place Order
                  </GlassButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Order Cards */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Package size={48} className="text-[var(--muted)] mb-4 opacity-40" />
            <p className="text-[var(--muted)] text-lg font-medium">No orders yet</p>
            <p className="text-[var(--muted)] text-sm mt-1 mb-4">Browse services and place your first order</p>
            <Link href="/reseller/services">
              <GlassButton size="sm"><ArrowRight size={16} /> Browse Services</GlassButton>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filtered.map((order: OrderItem, i: number) => {
                const isExpanded = expandedOrder === order.id
                const currentStep = STATUS_STEPS.indexOf(order.status)
                const isTerminal = order.status === 'failed' || order.status === 'cancelled' || order.status === 'rejected' || order.status === 'refunded'

                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    layout
                  >
                    <GlassCard hover padding="p-0" className="overflow-hidden">
                      <div className="p-5">
                        {/* Order Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                              <Smartphone size={18} className="text-[var(--accent)]" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-[var(--foreground)]">{order.service?.name || 'N/A'}</h3>
                                <span className="text-xs font-mono text-[var(--muted)]">{order.orderNumber}</span>
                              </div>
                              <p className="text-xs text-[var(--muted)] mt-0.5">
                                {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="text-right">
                              <p className="text-lg font-bold text-[var(--foreground)]">${order.sellingPrice?.toFixed(2)}</p>
                            </div>
                            <StatusBadge status={order.status} />
                          </div>
                        </div>

                        {/* Status Timeline (only for non-terminal) */}
                        {!isExpanded && !isTerminal && (
                          <div className="mt-4 flex items-center gap-2">
                            {STATUS_STEPS.map((step, idx) => (
                              <div key={step} className="flex items-center gap-2 flex-1">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${idx <= currentStep ? STATUS_COLORS[step] : 'bg-white/10'}`} />
                                <span className={`text-xs capitalize ${idx <= currentStep ? 'text-[var(--foreground)] font-medium' : 'text-[var(--muted)]'}`}>{step}</span>
                                {idx < STATUS_STEPS.length - 1 && <div className={`flex-1 h-px ${idx < currentStep ? 'bg-green-500/50' : 'bg-white/10'}`} />}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Expanded Details */}
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 space-y-4"
                          >
                            {/* Status Timeline (expanded) */}
                            <div className="p-4 rounded-xl bg-white/5">
                              <p className="text-xs text-[var(--muted)] uppercase tracking-wider font-medium mb-3">Order Progress</p>
                              <div className="space-y-3">
                                {STATUS_STEPS.map((step, idx) => {
                                  const isActive = idx === currentStep
                                  const isDone = idx < currentStep
                                  return (
                                    <div key={step} className="flex items-center gap-3">
                                      <div className={`w-3 h-3 rounded-full flex-shrink-0 border-2 ${isDone ? 'bg-green-500 border-green-500' : isActive ? `${STATUS_COLORS[step]} border-${STATUS_COLORS[step].replace('bg-', '')}` : 'bg-transparent border-white/20'}`} />
                                      <div className="flex-1">
                                        <p className={`text-sm capitalize ${isActive ? 'font-bold text-[var(--foreground)]' : isDone ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'}`}>{step}</p>
                                        {isDone && <p className="text-xs text-[var(--muted)]">Completed</p>}
                                        {isActive && <p className="text-xs text-[var(--accent)]">In progress</p>}
                                      </div>
                                    </div>
                                  )
                                })}
                                {isTerminal && (
                                  <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${STATUS_COLORS[order.status] || 'bg-gray-500'}`} />
                                    <div>
                                      <p className="text-sm capitalize font-bold text-[var(--foreground)]">{order.status}</p>
                                      <p className="text-xs text-[var(--muted)]">Final status</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Order Details */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              {resolveImei(order) && <div className="p-3 rounded-xl bg-white/5"><p className="text-xs text-[var(--muted)]">IMEI</p><p className="font-mono font-medium text-[var(--foreground)]">{resolveImei(order)}</p></div>}
                              {order.deviceInfo && <div className="p-3 rounded-xl bg-white/5"><p className="text-xs text-[var(--muted)]">Device</p><p className="text-[var(--foreground)]">{order.deviceInfo}</p></div>}
                              {order.processingTime && <div className="p-3 rounded-xl bg-white/5"><p className="text-xs text-[var(--muted)]">Processing</p><p className="text-[var(--foreground)]">{order.processingTime}</p></div>}
                              {order.completedAt && <div className="p-3 rounded-xl bg-white/5"><p className="text-xs text-[var(--muted)]">Completed</p><p className="text-[var(--foreground)]">{new Date(order.completedAt).toLocaleDateString()}</p></div>}
                            </div>

                            {/* Admin Notes */}
                            {order.notes && (
                              <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                                <p className="text-xs text-[var(--muted)] uppercase tracking-wider font-medium mb-2">Admin Notes</p>
                                <p className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">{order.notes}</p>
                              </div>
                            )}

                            {/* Result */}
                            {order.result && (
                              <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                                <p className="text-xs text-[var(--muted)] uppercase tracking-wider font-medium mb-2">Result</p>
                                <p className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">{order.result}</p>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>

                      {/* Expand/Collapse */}
                      <button
                        onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 border-t border-[var(--card-border)] text-xs text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/5 transition-all"
                      >
                        {isExpanded ? <><ChevronUp size={14} /> Show less</> : <><ChevronDown size={14} /> View details</>}
                      </button>
                    </GlassCard>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <OrderDetailDrawer
        open={!!viewOrder}
        onClose={() => setViewOrder(null)}
        order={viewOrder}
        loading={detailLoading}
        role="client"
        onUpdate={() => { if (viewOrder) loadDetail(viewOrder.id); refetch() }}
      />
    </div>
  )
}

function CustomFieldInput({ field, value, onChange, onImeiMultiChange, imeiCount, onAlert }: {
  field: CustomField
  value: string
  onChange: (val: string) => void
  onImeiMultiChange: (val: string) => void
  imeiCount: number
  onAlert?: (state: { title: string; message: string }) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { onAlert?.({ title: 'File Too Large', message: 'File must be less than 5MB.' }); return }
    const reader = new FileReader()
    reader.onloadend = () => { const base64 = reader.result as string; onChange(base64); if (field.fieldType === 'image') setPreview(base64) }
    reader.readAsDataURL(file)
  }

  switch (field.fieldType) {
    case 'text':
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{field.label} {field.required && '*'}</label>
          <input className="glass-input w-full" placeholder={field.placeholder} value={value} onChange={e => onChange(e.target.value)} />
        </div>
      )
    case 'textarea':
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{field.label} {field.required && '*'}</label>
          <textarea className="glass-input w-full h-20 resize-none" placeholder={field.placeholder} value={value} onChange={e => onChange(e.target.value)} />
        </div>
      )
    case 'number':
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{field.label} {field.required && '*'}</label>
          <input className="glass-input w-full" type="number" placeholder={field.placeholder} value={value} onChange={e => onChange(e.target.value)} />
        </div>
      )
    case 'select': {
      const options = field.options ? (typeof field.options === 'string' ? JSON.parse(field.options) : field.options) : []
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{field.label} {field.required && '*'}</label>
          <GlassDropdown
            options={[{ value: '', label: 'Select...' }, ...options.map((opt: string) => ({ value: opt, label: opt }))]}
            value={value}
            onChange={(v) => onChange(v)}
          />
        </div>
      )
    }
    case 'multiselect': {
      const msOptions = field.options ? (typeof field.options === 'string' ? JSON.parse(field.options) : field.options) : []
      const selected = value ? JSON.parse(value) : []
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{field.label} {field.required && '*'}</label>
          <div className="space-y-2">
            {msOptions.map((opt: string) => (
              <label key={opt} className="flex items-center gap-2 text-sm text-[var(--muted)] cursor-pointer">
                <input type="checkbox" checked={selected.includes(opt)} onChange={e => { const newVal = e.target.checked ? [...selected, opt] : selected.filter((s: string) => s !== opt); onChange(JSON.stringify(newVal)) }} className="rounded" />
                {opt}
              </label>
            ))}
          </div>
        </div>
      )
    }
    case 'checkbox':
      return (
        <div>
          <label className="flex items-center gap-2 text-sm text-[var(--muted)] cursor-pointer">
            <input type="checkbox" checked={value === 'true'} onChange={e => onChange(e.target.checked ? 'true' : 'false')} className="rounded" />
            {field.label} {field.required && '*'}
          </label>
        </div>
      )
    case 'file':
    case 'image':
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{field.label} {field.required && '*'}</label>
          <div className="border-2 border-dashed border-[var(--card-border)] rounded-xl p-6 text-center cursor-pointer hover:border-[var(--accent)] transition-colors" onClick={() => fileInputRef.current?.click()}>
            {preview && field.fieldType === 'image' ? (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Preview" className="max-h-32 rounded-lg" />
                <button type="button" onClick={(e) => { e.stopPropagation(); setPreview(null); onChange('') }} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center"><X size={12} /></button>
              </div>
            ) : (
              <>
                <Upload size={24} className="mx-auto text-[var(--muted)] mb-2" />
                <p className="text-sm text-[var(--muted)]">Click to upload {field.fieldType === 'image' ? 'image' : 'file'}</p>
                <p className="text-xs text-[var(--muted)] mt-1">Max 5MB</p>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept={field.fieldType === 'image' ? 'image/jpeg,image/png,image/webp' : '*/*'} className="hidden" onChange={handleFileChange} />
        </div>
      )
    case 'imei_single':
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{field.label} {field.required && '*'}</label>
          <input className="glass-input w-full font-mono" placeholder="15-digit IMEI number" value={value} onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 15))} maxLength={15} />
          {value && value.length !== 15 && <p className="text-xs text-amber-500 mt-1 flex items-center gap-1"><AlertCircle size={12} /> IMEI must be exactly 15 digits ({value.length}/15)</p>}
        </div>
      )
    case 'imei_multi':
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{field.label} {field.required && '*'}</label>
          <textarea className="glass-input w-full h-24 resize-none font-mono text-sm" placeholder={"Enter IMEI numbers\nOne per line"} value={value} onChange={e => onImeiMultiChange(e.target.value)} />
          <p className="text-xs text-[var(--muted)] mt-1">{imeiCount} IMEI{imeiCount !== 1 ? 's' : ''} entered</p>
        </div>
      )
    case 'serial_single':
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{field.label} {field.required && '*'}</label>
          <input className="glass-input w-full font-mono" placeholder="Serial number" value={value} onChange={e => onChange(e.target.value)} />
        </div>
      )
    case 'serial_multi':
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{field.label} {field.required && '*'}</label>
          <textarea className="glass-input w-full h-24 resize-none font-mono text-sm" placeholder={"Serial number 1\nSerial number 2"} value={value} onChange={e => onChange(e.target.value)} />
        </div>
      )
    default:
      return null
  }
}
