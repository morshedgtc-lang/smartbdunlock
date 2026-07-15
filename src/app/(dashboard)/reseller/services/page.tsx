'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassDropdown, DropdownOption } from '@/components/ui/GlassDropdown'
import { AlertModal } from '@/components/ui/ConfirmDialog'
import { useApi } from '@/hooks/useApi'
import { useToast } from '@/components/ui/Toast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Loader2, X, Package, Clock, DollarSign,
  ArrowRight, Shield, Zap, Upload, AlertCircle, CheckCircle2,
} from 'lucide-react'
import { useState, useRef, useMemo } from 'react'

const TYPE_ICONS: Record<string, string> = {
  unlock: '🔓',
  flash: '⚡',
  repair: '🔧',
  imei: '📱',
}

const TYPE_COLORS: Record<string, string> = {
  unlock: 'from-indigo-500 to-purple-500',
  flash: 'from-amber-500 to-orange-500',
  repair: 'from-emerald-500 to-teal-500',
  imei: 'from-blue-500 to-cyan-500',
}

export default function ClientServicesPage() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [selectedService, setSelectedService] = useState<any>(null)
  const [creating, setCreating] = useState(false)
  const [orderForm, setOrderForm] = useState({ notes: '' })
  const [customValues, setCustomValues] = useState<Record<string, string>>({})
  const [imeiCount, setImeiCount] = useState<Record<string, number>>({})
  const [alertState, setAlertState] = useState<{ title: string; message: string } | null>(null)
  const { toast } = useToast()
  const { data, loading, error } = useApi<any>({ url: '/api/services' })
  const { data: catData } = useApi<any>({ url: '/api/service-categories' })
  const { data: walletData } = useApi<any>({ url: '/api/wallet' })

  const allServices = data?.services || []
  const categories = catData?.categories || []
  const balance = walletData?.balance ?? 0

  const services = useMemo(() =>
    allServices.filter((s: any) => s.status === 'active' && s.clientVisible !== false),
    [allServices]
  )

  const filtered = useMemo(() => {
    let result = services
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((s: any) =>
        s.name.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.type.toLowerCase().includes(q)
      )
    }
    if (categoryFilter) {
      result = result.filter((s: any) => s.categoryId === categoryFilter)
    }
    return result
  }, [services, search, categoryFilter])

  const categoryOptions: DropdownOption[] = [
    { value: '', label: 'All Categories' },
    ...categories.map((c: any) => ({ value: c.id, label: c.name })),
  ]

  const customFields = selectedService?.customFields?.filter((f: any) => f.visibleToClient) || []

  const openOrderModal = (service: any) => {
    setSelectedService(service)
    setOrderForm({ notes: '' })
    setCustomValues({})
    setImeiCount({})
    setShowOrderModal(true)
  }

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedService) return
    setCreating(true)
    try {
      const body: any = {
        serviceId: selectedService.id,
        notes: orderForm.notes || undefined,
        customFieldValues: customValues,
      }
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast('success', `Order ${data.orderNumber} created successfully!`)
      setShowOrderModal(false)
      setSelectedService(null)
    } catch (err: any) {
      toast('error', err.message)
    } finally {
      setCreating(false)
    }
  }

  const updateCustomValue = (fieldId: string, value: string) => {
    setCustomValues(prev => ({ ...prev, [fieldId]: value }))
  }

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
        <Header title="Services" subtitle="Loading..." />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Header title="Services" />
        <div className="p-6 flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <AlertModal
        open={!!alertState}
        onClose={() => setAlertState(null)}
        title={alertState?.title || ''}
        message={alertState?.message || ''}
        variant="warning"
      />
      <Header title="Services" subtitle={`${services.length} services available`} />
      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              className="glass-input pl-9 w-full"
              placeholder="Search services..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="w-56">
            <GlassDropdown
              options={categoryOptions}
              value={categoryFilter}
              onChange={setCategoryFilter}
              placeholder="All Categories"
              size="sm"
            />
          </div>
        </div>

        {/* Balance Card */}
        <GlassCard glow premium padding="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--muted)]">Available Balance</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">${balance.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30 flex items-center justify-center">
              <DollarSign size={22} className="text-white" />
            </div>
          </div>
        </GlassCard>

        {/* Service Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Package size={48} className="text-[var(--muted)] mb-4 opacity-40" />
            <p className="text-[var(--muted)] text-lg font-medium">No services found</p>
            <p className="text-[var(--muted)] text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence mode="popLayout">
              {filtered.map((service: any, i: number) => {
                const typeColor = TYPE_COLORS[service.type] || TYPE_COLORS.unlock
                const typeIcon = TYPE_ICONS[service.type] || '📦'
                const hasBalance = balance >= service.sellingPrice
                const fieldCount = service.customFields?.filter((f: any) => f.visibleToClient).length || 0

                return (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <GlassCard hover premium padding="p-0" className="h-full flex flex-col overflow-hidden">
                      {/* Top gradient bar */}
                      <div className={`h-1.5 bg-gradient-to-r ${typeColor}`} />

                      <div className="p-5 flex flex-col flex-1">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${typeColor} shadow-lg flex items-center justify-center text-lg`}>
                              {typeIcon}
                            </div>
                            <div>
                              <h3 className="font-bold text-[var(--foreground)] text-[15px] leading-tight">{service.name}</h3>
                              <p className="text-xs text-[var(--muted)] mt-0.5 capitalize">{service.type}</p>
                            </div>
                          </div>
                          {service.categoryName && (
                            <span className="text-[10px] px-2 py-1 rounded-lg bg-white/5 text-[var(--muted)] font-medium whitespace-nowrap">
                              {service.categoryName}
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        {service.description && (
                          <p className="text-sm text-[var(--muted)] mb-4 line-clamp-2 leading-relaxed">
                            {service.description}
                          </p>
                        )}

                        {/* Meta */}
                        <div className="flex items-center gap-4 mb-4 text-xs text-[var(--muted)]">
                          {service.processingTime && (
                            <div className="flex items-center gap-1.5">
                              <Clock size={13} className="text-[var(--accent)]" />
                              <span>{service.processingTime}</span>
                            </div>
                          )}
                          {fieldCount > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Shield size={13} className="text-[var(--accent)]" />
                              <span>{fieldCount} field{fieldCount !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>

                        {/* Spacer to push footer down */}
                        <div className="flex-1" />

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-3 border-t border-[var(--card-border)]">
                          <div>
                            <p className="text-xs text-[var(--muted)]">Price</p>
                            <p className="text-lg font-bold text-[var(--foreground)]">
                              ${service.sellingPrice?.toFixed(2)}
                            </p>
                          </div>
                          <GlassButton
                            size="sm"
                            onClick={() => openOrderModal(service)}
                            disabled={!hasBalance}
                            className={!hasBalance ? 'opacity-60' : ''}
                          >
                            {hasBalance ? (
                              <>
                                <Zap size={14} /> Order Now
                              </>
                            ) : (
                              'Insufficient Balance'
                            )}
                          </GlassButton>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Order Modal */}
      <AnimatePresence>
        {showOrderModal && selectedService && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="glass p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${TYPE_COLORS[selectedService.type] || TYPE_COLORS.unlock} shadow-lg flex items-center justify-center text-base`}>
                    {TYPE_ICONS[selectedService.type] || '📦'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--foreground)]">{selectedService.name}</h3>
                    <p className="text-xs text-[var(--muted)] capitalize">{selectedService.type} Service</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowOrderModal(false); setSelectedService(null) }}
                  className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Balance */}
              <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-xs text-[var(--muted)]">Your Balance</p>
                <p className="text-xl font-bold text-[var(--foreground)]">${balance.toLocaleString()}</p>
              </div>

              {/* Service Info */}
              <div className="mb-5 p-3 rounded-xl bg-white/5">
                <div className="grid grid-cols-2 gap-2 text-xs text-[var(--muted)]">
                  <span>Price: <strong className="text-[var(--foreground)]">${selectedService.sellingPrice}</strong></span>
                  <span>Processing: <strong className="text-[var(--foreground)]">{selectedService.processingTime || 'N/A'}</strong></span>
                </div>
                {selectedService.description && (
                  <p className="text-xs text-[var(--muted)] mt-2">{selectedService.description}</p>
                )}
              </div>

              <form onSubmit={handleCreateOrder} className="space-y-4">
                {/* Dynamic Custom Fields */}
                {customFields.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-[var(--foreground)] flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-[var(--accent)]" />
                      Required Information
                    </p>
                    {customFields.map((field: any) => (
                      <CustomFieldInput
                        key={field.id}
                        field={field}
                        value={customValues[field.id] || ''}
                        onChange={(val) => updateCustomValue(field.id, val)}
                        onImeiMultiChange={(val) => handleImeiMultiInput(field.id, val)}
                        imeiCount={imeiCount[field.id] || 0}
                        onAlert={setAlertState}
                      />
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Notes</label>
                  <textarea
                    className="glass-input w-full h-20 resize-none"
                    placeholder="Additional notes for this order..."
                    value={orderForm.notes}
                    onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })}
                  />
                </div>

                <div className="p-3 rounded-xl bg-white/5">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--muted)]">Amount to be charged</span>
                    <span className="font-bold text-[var(--foreground)]">${selectedService.sellingPrice}</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <GlassButton
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => { setShowOrderModal(false); setSelectedService(null) }}
                  >
                    Cancel
                  </GlassButton>
                  <GlassButton type="submit" className="flex-1" disabled={creating}>
                    {creating ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                    Place Order
                  </GlassButton>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CustomFieldInput({ field, value, onChange, onImeiMultiChange, imeiCount, onAlert }: {
  field: any
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
    reader.onloadend = () => {
      const base64 = reader.result as string
      onChange(base64)
      if (field.fieldType === 'image') setPreview(base64)
    }
    reader.readAsDataURL(file)
  }

  switch (field.fieldType) {
    case 'text':
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
            {field.label} {field.required && '*'}
          </label>
          <input className="glass-input w-full" placeholder={field.placeholder} value={value} onChange={e => onChange(e.target.value)} />
        </div>
      )
    case 'textarea':
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
            {field.label} {field.required && '*'}
          </label>
          <textarea className="glass-input w-full h-20 resize-none" placeholder={field.placeholder} value={value} onChange={e => onChange(e.target.value)} />
        </div>
      )
    case 'number':
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
            {field.label} {field.required && '*'}
          </label>
          <input className="glass-input w-full" type="number" placeholder={field.placeholder} value={value} onChange={e => onChange(e.target.value)} />
        </div>
      )
    case 'select': {
      const options = field.options ? (typeof field.options === 'string' ? JSON.parse(field.options) : field.options) : []
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
            {field.label} {field.required && '*'}
          </label>
          <select className="glass-input w-full" value={value} onChange={e => onChange(e.target.value)}>
            <option value="">Select...</option>
            {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      )
    }
    case 'multiselect': {
      const msOptions = field.options ? (typeof field.options === 'string' ? JSON.parse(field.options) : field.options) : []
      const selected = value ? JSON.parse(value) : []
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
            {field.label} {field.required && '*'}
          </label>
          <div className="space-y-2">
            {msOptions.map((opt: string) => (
              <label key={opt} className="flex items-center gap-2 text-sm text-[var(--muted)] cursor-pointer">
                <input type="checkbox" checked={selected.includes(opt)} onChange={e => {
                  const newVal = e.target.checked ? [...selected, opt] : selected.filter((s: string) => s !== opt)
                  onChange(JSON.stringify(newVal))
                }} className="rounded" />
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
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
            {field.label} {field.required && '*'}
          </label>
          <div className="border-2 border-dashed border-[var(--card-border)] rounded-xl p-6 text-center cursor-pointer hover:border-[var(--accent)] transition-colors" onClick={() => fileInputRef.current?.click()}>
            {preview && field.fieldType === 'image' ? (
              <div className="relative inline-block">
                <img src={preview} alt="Preview" className="max-h-32 rounded-lg" />
                <button type="button" onClick={(e) => { e.stopPropagation(); setPreview(null); onChange('') }} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center">
                  <X size={12} />
                </button>
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
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
            {field.label} {field.required && '*'}
          </label>
          <input className="glass-input w-full font-mono" placeholder="15-digit IMEI number" value={value} onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 15))} maxLength={15} />
          {value && value.length !== 15 && (
            <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
              <AlertCircle size={12} /> IMEI must be exactly 15 digits ({value.length}/15)
            </p>
          )}
        </div>
      )
    case 'imei_multi':
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
            {field.label} {field.required && '*'}
          </label>
          <textarea className="glass-input w-full h-24 resize-none font-mono text-sm" placeholder={"Enter IMEI numbers\nOne per line"} value={value} onChange={e => onImeiMultiChange(e.target.value)} />
          <p className="text-xs text-[var(--muted)] mt-1">{imeiCount} IMEI{imeiCount !== 1 ? 's' : ''} entered</p>
        </div>
      )
    case 'serial_single':
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
            {field.label} {field.required && '*'}
          </label>
          <input className="glass-input w-full font-mono" placeholder="Serial number" value={value} onChange={e => onChange(e.target.value)} />
        </div>
      )
    case 'serial_multi':
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
            {field.label} {field.required && '*'}
          </label>
          <textarea className="glass-input w-full h-24 resize-none font-mono text-sm" placeholder={"Serial number 1\nSerial number 2"} value={value} onChange={e => onChange(e.target.value)} />
        </div>
      )
    default:
      return null
  }
}
