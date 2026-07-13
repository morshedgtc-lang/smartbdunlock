'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { useToast } from '@/components/ui/Toast'
import { motion } from 'framer-motion'
import { Plus, Search, Eye, Loader2, X, Smartphone, Upload, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useState, useRef } from 'react'

export default function ResellerOrdersPage() {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [orderForm, setOrderForm] = useState({
    serviceId: '',
    notes: '',
  })
  const [customValues, setCustomValues] = useState<Record<string, string>>({})
  const [imeiCount, setImeiCount] = useState<Record<string, number>>({})
  const { toast } = useToast()
  const { data, loading, error, refetch } = useApi<any>({ url: '/api/orders' })
  const { data: servicesData } = useApi<any>({ url: '/api/services' })
  const { data: walletData } = useApi<any>({ url: '/api/wallet' })
  const allOrders = data?.orders || []
  const services = servicesData?.services || []
  const balance = walletData?.balance ?? 0

  const filtered = allOrders.filter((o: any) =>
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) || o.imei?.toLowerCase().includes(search.toLowerCase())
  )

  const selectedService = services.find((s: any) => s.id === orderForm.serviceId)
  const customFields = selectedService?.customFields?.filter((f: any) => f.visibleToClient) || []

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderForm.serviceId) {
      toast('error', 'Please select a service')
      return
    }
    setCreating(true)
    try {
      const body: any = {
        serviceId: orderForm.serviceId,
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
      toast('success', `Order ${data.orderNumber} created`)
      setShowCreate(false)
      setOrderForm({ serviceId: '', notes: '' })
      setCustomValues({})
      setImeiCount({})
      refetch()
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
      <Header title="My Orders" subtitle={`${allOrders.length} orders`} />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input className="glass-input pl-9 w-64" placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <GlassButton size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Order
          </GlassButton>
        </div>

        {/* Create Order Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
              className="glass p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--foreground)]">Create New Order</h3>
                <button onClick={() => { setShowCreate(false); setCustomValues({}); setImeiCount({}) }} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                  <X size={20} />
                </button>
              </div>

              <div className="mb-4 p-3 rounded-xl bg-white/5 dark:bg-white/5">
                <p className="text-sm text-[var(--muted)]">Your Balance</p>
                <p className="text-xl font-bold text-[var(--foreground)]">${balance.toLocaleString()}</p>
              </div>

              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Service *</label>
                  <select
                    className="glass-input w-full"
                    value={orderForm.serviceId}
                    onChange={e => {
                      setOrderForm({ ...orderForm, serviceId: e.target.value })
                      setCustomValues({})
                      setImeiCount({})
                    }}
                    required
                  >
                    <option value="">Select a service...</option>
                    {services.filter((s: any) => s.status === 'active').map((service: any) => (
                      <option key={service.id} value={service.id}>
                        {service.name} — ${service.sellingPrice} ({service.processingTime || 'N/A'})
                      </option>
                    ))}
                  </select>
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

                {/* Dynamic Custom Fields */}
                {customFields.length > 0 && (
                  <div className="space-y-4 border-t border-[var(--card-border)] pt-4">
                    <p className="text-sm font-medium text-[var(--foreground)]">Required Information</p>
                    {customFields.map((field: any) => (
                      <CustomFieldInput
                        key={field.id}
                        field={field}
                        value={customValues[field.id] || ''}
                        onChange={(val) => updateCustomValue(field.id, val)}
                        onImeiMultiChange={(val) => handleImeiMultiInput(field.id, val)}
                        imeiCount={imeiCount[field.id] || 0}
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

                {selectedService && (
                  <div className="p-3 rounded-xl bg-white/5 dark:bg-white/5">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--muted)]">Amount to be charged</span>
                      <span className="font-bold text-[var(--foreground)]">${selectedService.sellingPrice}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <GlassButton type="button" variant="secondary" className="flex-1" onClick={() => { setShowCreate(false); setCustomValues({}); setImeiCount({}) }}>
                    Cancel
                  </GlassButton>
                  <GlassButton type="submit" className="flex-1" disabled={creating}>
                    {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    Place Order
                  </GlassButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        <GlassCard padding="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Order</th>
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Service</th>
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Device</th>
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Status</th>
                  <th className="text-right py-4 px-4 text-[var(--muted)] font-medium">Price</th>
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <Smartphone size={40} className="mx-auto text-[var(--muted)] mb-3 opacity-50" />
                      <p className="text-[var(--muted)]">No orders yet. Create your first order above.</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((order: any, i: number) => (
                    <motion.tr
                      key={order.id}
                      className="border-b border-[var(--card-border)] hover:bg-white/5 dark:hover:bg-white/5 transition-colors"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <td className="py-3 px-4 font-mono font-medium text-[var(--foreground)]">{order.orderNumber}</td>
                      <td className="py-3 px-4 text-[var(--foreground)]">{order.service?.name || 'N/A'}</td>
                      <td className="py-3 px-4 text-[var(--muted)]">{order.deviceInfo || '—'}</td>
                      <td className="py-3 px-4"><StatusBadge status={order.status} /></td>
                      <td className="py-3 px-4 text-right font-medium text-[var(--foreground)]">${order.sellingPrice?.toFixed(2) || '0.00'}</td>
                      <td className="py-3 px-4 text-xs text-[var(--muted)]">{new Date(order.createdAt).toLocaleDateString()}</td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

function CustomFieldInput({ field, value, onChange, onImeiMultiChange, imeiCount }: {
  field: any
  value: string
  onChange: (val: string) => void
  onImeiMultiChange: (val: string) => void
  imeiCount: number
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      alert('File must be less than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      onChange(base64)
      if (field.fieldType === 'image') {
        setPreview(base64)
      }
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
          <input
            className="glass-input w-full"
            placeholder={field.placeholder}
            value={value}
            onChange={e => onChange(e.target.value)}
          />
        </div>
      )

    case 'textarea':
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
            {field.label} {field.required && '*'}
          </label>
          <textarea
            className="glass-input w-full h-20 resize-none"
            placeholder={field.placeholder}
            value={value}
            onChange={e => onChange(e.target.value)}
          />
        </div>
      )

    case 'number':
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
            {field.label} {field.required && '*'}
          </label>
          <input
            className="glass-input w-full"
            type="number"
            placeholder={field.placeholder}
            value={value}
            onChange={e => onChange(e.target.value)}
          />
        </div>
      )

    case 'select':
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

    case 'multiselect':
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
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={e => {
                    const newVal = e.target.checked
                      ? [...selected, opt]
                      : selected.filter((s: string) => s !== opt)
                    onChange(JSON.stringify(newVal))
                  }}
                  className="rounded"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      )

    case 'checkbox':
      return (
        <div>
          <label className="flex items-center gap-2 text-sm text-[var(--muted)] cursor-pointer">
            <input
              type="checkbox"
              checked={value === 'true'}
              onChange={e => onChange(e.target.checked ? 'true' : 'false')}
              className="rounded"
            />
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
          <div
            className="border-2 border-dashed border-[var(--card-border)] rounded-xl p-6 text-center cursor-pointer hover:border-[var(--accent)] transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {preview && field.fieldType === 'image' ? (
              <div className="relative inline-block">
                <img src={preview} alt="Preview" className="max-h-32 rounded-lg" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPreview(null); onChange('') }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <>
                <Upload size={24} className="mx-auto text-[var(--muted)] mb-2" />
                <p className="text-sm text-[var(--muted)]">Click to upload {field.fieldType === 'image' ? 'image' : 'file'}</p>
                <p className="text-xs text-[var(--muted)] mt-1">Max 5MB • JPG, PNG, WEBP</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={field.fieldType === 'image' ? 'image/jpeg,image/png,image/webp' : '*/*'}
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )

    case 'imei_single':
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
            {field.label} {field.required && '*'}
          </label>
          <input
            className="glass-input w-full font-mono"
            placeholder="15-digit IMEI number"
            value={value}
            onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 15))}
            maxLength={15}
          />
          {value && value.length !== 15 && (
            <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
              <AlertCircle size={12} /> IMEI must be exactly 15 digits ({value.length}/15)
            </p>
          )}
        </div>
      )

    case 'imei_multi':
      const imeiLines = value ? value.split('\n').filter(Boolean) : []
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
            {field.label} {field.required && '*'}
          </label>
          <textarea
            className="glass-input w-full h-24 resize-none font-mono text-sm"
            placeholder={"Enter IMEI numbers\nOne per line"}
            value={value}
            onChange={e => onImeiMultiChange(e.target.value)}
          />
          <div className="flex items-center gap-3 mt-1">
            <p className="text-xs text-[var(--muted)]">
              {imeiCount} IMEI{imeiCount !== 1 ? 's' : ''} entered
            </p>
            {imeiLines.length > 0 && (
              <p className="text-xs text-[var(--muted)]">• One per line, duplicates auto-removed</p>
            )}
          </div>
        </div>
      )

    case 'serial_single':
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
            {field.label} {field.required && '*'}
          </label>
          <input
            className="glass-input w-full font-mono"
            placeholder="Serial number"
            value={value}
            onChange={e => onChange(e.target.value)}
          />
        </div>
      )

    case 'serial_multi':
      const serialLines = value ? value.split('\n').filter(Boolean) : []
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
            {field.label} {field.required && '*'}
          </label>
          <textarea
            className="glass-input w-full h-24 resize-none font-mono text-sm"
            placeholder={"Serial number 1\nSerial number 2"}
            value={value}
            onChange={e => onChange(e.target.value)}
          />
          <p className="text-xs text-[var(--muted)] mt-1">{serialLines.length} serial number{serialLines.length !== 1 ? 's' : ''} entered</p>
        </div>
      )

    default:
      return null
  }
}
