'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { AlertModal } from '@/components/ui/ConfirmDialog'
import { useApi } from '@/hooks/useApi'
import { useToast } from '@/components/ui/Toast'
import { motion } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Loader2, Clock, DollarSign, Shield,
  Upload, ArrowRight, CheckCircle2, AlertCircle, X,
} from 'lucide-react'
import Link from 'next/link'
import { useState, useRef } from 'react'

const TYPE_ICONS: Record<string, string> = {
  unlock: '🔓', flash: '⚡', repair: '🔧', imei: '📱',
}
const TYPE_COLORS: Record<string, string> = {
  unlock: 'from-indigo-500 to-purple-500',
  flash: 'from-amber-500 to-orange-500',
  repair: 'from-emerald-500 to-teal-500',
  imei: 'from-blue-500 to-cyan-500',
}

interface ServiceCustomField {
  id: string
  fieldType: string
  label: string
  placeholder?: string
  options?: string | string[]
  required: boolean
  visibleToClient: boolean
}

interface ServiceItem {
  id: string
  name: string
  description?: string
  type: string
  sellingPrice: number
  cost: number
  processingTime?: string
  status: string
  categoryName?: string
  customFields?: ServiceCustomField[]
}

interface WalletData {
  balance: number
}

export default function ServiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const serviceId = params?.id as string
  const { toast } = useToast()

  const { data, loading, error } = useApi<{ services: ServiceItem[] }>({ url: `/api/services` })
  const { data: walletData } = useApi<WalletData>({ url: '/api/wallet' })

  const service = data?.services?.find((s: ServiceItem) => s.id === serviceId)
  const balance = walletData?.balance ?? 0

  const [showOrderForm, setShowOrderForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [orderForm, setOrderForm] = useState({ notes: '' })
  const [customValues, setCustomValues] = useState<Record<string, string>>({})
  const [imeiCount, setImeiCount] = useState<Record<string, number>>({})
  const [alertState, setAlertState] = useState<{ title: string; message: string } | null>(null)

  const customFields = service?.customFields?.filter((f: ServiceCustomField) => f.visibleToClient) || []
  const hasBalance = balance >= (service?.sellingPrice || 0)

  if (loading) {
    return (
      <div>
        <Header title="Service Details" subtitle="Loading..." />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
        </div>
      </div>
    )
  }

  if (error || !service) {
    return (
      <div>
        <Header title="Service Details" />
        <div className="p-6 flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-red-400 text-sm">{error || 'Service not found'}</p>
          <Link href="/reseller/services" className="text-[var(--accent)] text-sm hover:underline">Back to Services</Link>
        </div>
      </div>
    )
  }

  const typeColor = TYPE_COLORS[service.type] || TYPE_COLORS.unlock
  const typeIcon = TYPE_ICONS[service.type] || '📦'

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const body: { serviceId: string; notes?: string; customFieldValues: Record<string, string> } = {
        serviceId: service.id,
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
      setShowOrderForm(false)
      router.push('/reseller/orders')
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
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

  return (
    <div>
      <AlertModal
        open={!!alertState}
        onClose={() => setAlertState(null)}
        title={alertState?.title || ''}
        message={alertState?.message || ''}
        variant="warning"
      />
      <Header title="Service Details" subtitle={service.name} />
      <div className="p-6 space-y-6">
        {/* Back Link */}
        <Link href="/reseller/services" className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
          <ArrowLeft size={16} /> Back to Services
        </Link>

        {/* Service Header Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard glow premium padding="p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${typeColor} shadow-lg flex items-center justify-center text-2xl flex-shrink-0`}>
                {typeIcon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-[var(--foreground)]">{service.name}</h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {service.categoryName && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 font-medium">{service.categoryName}</span>
                      )}
                      <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-[var(--muted)] capitalize">{service.type}</span>
                    </div>
                  </div>
                </div>
                {service.description && (
                  <p className="text-sm text-[var(--muted)] mt-3 leading-relaxed">{service.description}</p>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Info Grid */}
        <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard padding="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
                <DollarSign size={16} className="text-white" />
              </div>
              <p className="text-xs text-[var(--muted)] uppercase tracking-wider font-medium">Price</p>
            </div>
            <p className="text-2xl font-bold text-[var(--foreground)]">${service.sellingPrice?.toFixed(2)}</p>
          </GlassCard>
          <GlassCard padding="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/20 flex items-center justify-center">
                <Clock size={16} className="text-white" />
              </div>
              <p className="text-xs text-[var(--muted)] uppercase tracking-wider font-medium">Processing Time</p>
            </div>
            <p className="text-2xl font-bold text-[var(--foreground)]">{service.processingTime || 'N/A'}</p>
          </GlassCard>
          <GlassCard padding="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
                <Shield size={16} className="text-white" />
              </div>
              <p className="text-xs text-[var(--muted)] uppercase tracking-wider font-medium">Required Fields</p>
            </div>
            <p className="text-2xl font-bold text-[var(--foreground)]">{customFields.length}</p>
          </GlassCard>
        </motion.div>

        {/* Required Information */}
        {customFields.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <GlassCard>
              <h3 className="font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent)]" />
                Required Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {customFields.map((field: ServiceCustomField) => {
                  const fieldIcons: Record<string, string> = {
                    imei_single: '📱', imei_multi: '📱', serial_single: '🔢', serial_multi: '🔢',
                    image: '📷', file: '📎', text: '📝', textarea: '📝', number: '🔢',
                    select: '📋', multiselect: '📋', checkbox: '☑️',
                  }
                  const fieldTypeLabels: Record<string, string> = {
                    imei_single: 'IMEI Number', imei_multi: 'Multiple IMEIs',
                    serial_single: 'Serial Number', serial_multi: 'Multiple Serials',
                    image: 'Image Upload', file: 'File Upload',
                    text: 'Text Input', textarea: 'Text Area', number: 'Number',
                    select: 'Select Option', multiselect: 'Multi Select', checkbox: 'Checkbox',
                  }
                  return (
                    <div key={field.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
                      <span className="text-lg">{fieldIcons[field.fieldType] || '📝'}</span>
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">{field.label} {field.required && <span className="text-red-400">*</span>}</p>
                        <p className="text-xs text-[var(--muted)]">{fieldTypeLabels[field.fieldType] || field.fieldType}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Order Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          {!showOrderForm ? (
            <GlassCard glow premium padding="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm text-[var(--muted)]">Total Cost</p>
                  <p className="text-3xl font-bold text-[var(--foreground)]">${service.sellingPrice?.toFixed(2)}</p>
                  {!hasBalance && (
                    <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> Insufficient balance (${balance.toFixed(2)} available)
                    </p>
                  )}
                </div>
                <GlassButton size="lg" onClick={() => setShowOrderForm(true)} disabled={!hasBalance} className={!hasBalance ? 'opacity-60' : ''}>
                  {hasBalance ? <><ArrowRight size={18} /> Create Order</> : 'Insufficient Balance'}
                </GlassButton>
              </div>
            </GlassCard>
          ) : (
            <GlassCard padding="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-[var(--foreground)]">Create Order</h3>
                <button onClick={() => { setShowOrderForm(false); setCustomValues({}); setImeiCount({}) }} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                  <X size={20} />
                </button>
              </div>

              {/* Balance */}
              <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-xs text-[var(--muted)]">Your Balance</p>
                <p className="text-xl font-bold text-[var(--foreground)]">${balance.toLocaleString()}</p>
              </div>

              <form onSubmit={handleCreateOrder} className="space-y-4">
                {customFields.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-[var(--foreground)] flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-[var(--accent)]" />
                      Required Information
                    </p>
                    {customFields.map((field: ServiceCustomField) => (
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
                    <span className="font-bold text-[var(--foreground)]">${service.sellingPrice?.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <GlassButton type="button" variant="secondary" className="flex-1" onClick={() => { setShowOrderForm(false); setCustomValues({}); setImeiCount({}) }}>
                    Cancel
                  </GlassButton>
                  <GlassButton type="submit" className="flex-1" disabled={creating}>
                    {creating ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                    Place Order
                  </GlassButton>
                </div>
              </form>
            </GlassCard>
          )}
        </motion.div>
      </div>
    </div>
  )
}

function CustomFieldInput({ field, value, onChange, onImeiMultiChange, imeiCount, onAlert }: {
  field: ServiceCustomField
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
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
