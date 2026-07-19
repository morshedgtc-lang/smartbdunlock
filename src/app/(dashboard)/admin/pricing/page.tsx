'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassDropdown } from '@/components/ui/GlassDropdown'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { useToast } from '@/components/ui/Toast'
import { Tabs } from '@/components/ui/Tabs'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit, Trash2, Loader2, X, DollarSign, Percent, Tag, Truck, Calculator, ToggleLeft, ToggleRight } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface PricingRule {
  id: string
  type: 'fixed' | 'percentage' | 'category' | 'supplier'
  value: number
  category?: string
  providerId?: string
  currency?: string
  active: boolean
  createdAt: string
  updatedAt: string
}

interface SupplierItem {
  id: string
  name: string
}

interface CategoryItem {
  id: string
  name: string
}

interface CalculateResult {
  supplierCost: number
  profit: number
  sellingPrice: number
  appliedRules: string[]
}

const emptyRule = { type: 'fixed', value: '', category: '', providerId: '', currency: 'USD', active: true }

export default function PricingPage() {
  const [activeTab, setActiveTab] = useState('global')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<PricingRule | null>(null)
  const [form, setForm] = useState(emptyRule)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)
  const { toast } = useToast()
  const { data, loading, error, refetch } = useApi<{ rules: PricingRule[] }>({ url: '/api/pricing-rules' })
  const { data: suppliersData } = useApi<{ suppliers: SupplierItem[] }>({ url: '/api/suppliers' })
  const { data: catData } = useApi<{ categories: CategoryItem[] }>({ url: '/api/service-categories' })

  const rules = data?.rules || []
  const suppliers = suppliersData?.suppliers || []
  const categories = catData?.categories || []

  const globalRules = rules.filter((r: PricingRule) => r.type === 'fixed' || r.type === 'percentage')
  const categoryRules = rules.filter((r: PricingRule) => r.type === 'category')
  const supplierRules = rules.filter((r: PricingRule) => r.type === 'supplier')

  const [calcForm, setCalcForm] = useState({ supplierCost: '', categoryId: '', supplierId: '', profitType: '', profitValue: '' })
  const [calcResult, setCalcResult] = useState<CalculateResult | null>(null)
  const [calculating, setCalculating] = useState(false)

  const handleCalculate = async () => {
    if (!calcForm.supplierCost) return
    setCalculating(true)
    try {
      const body: Record<string, unknown> = { supplierCost: parseFloat(calcForm.supplierCost) }
      if (calcForm.categoryId) body.category = categories.find((c: CategoryItem) => c.id === calcForm.categoryId)?.name
      if (calcForm.supplierId) body.providerId = calcForm.supplierId
      if (calcForm.profitType) body.profitType = calcForm.profitType
      if (calcForm.profitValue) body.profitValue = parseFloat(calcForm.profitValue)

      const res = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCalcResult(data)
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Calculation failed')
    } finally {
      setCalculating(false)
    }
  }

  const openCreate = (type: string) => {
    setEditing(null)
    setForm({ ...emptyRule, type })
    setShowModal(true)
  }

  const openEdit = (rule: PricingRule) => {
    setEditing(rule)
    setForm({
      type: rule.type,
      value: String(rule.value),
      category: rule.category || '',
      providerId: rule.providerId || '',
      currency: rule.currency || 'USD',
      active: rule.active,
    })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        type: form.type,
        value: parseFloat(form.value),
        category: form.category || undefined,
        providerId: form.providerId || undefined,
        currency: form.currency,
        active: form.active,
      }
      const method = editing ? 'PATCH' : 'POST'
      const url = editing ? `/api/pricing-rules/${editing.id}` : '/api/pricing-rules'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: editing ? JSON.stringify({ value: body.value, category: body.category, providerId: body.providerId, currency: body.currency, active: body.active }) : JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast('success', editing ? 'Rule updated' : 'Rule created')
      setShowModal(false)
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRule = async (id: string, name: string) => {
    setConfirmDelete({ id, name })
  }

  const confirmDeleteRule = async () => {
    if (!confirmDelete) return
    setDeleting(confirmDelete.id)
    try {
      const res = await fetch(`/api/pricing-rules/${confirmDelete.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast('success', 'Rule deleted')
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
    } finally {
      setDeleting(null)
      setConfirmDelete(null)
    }
  }

  const toggleActive = async (rule: PricingRule) => {
    try {
      const res = await fetch(`/api/pricing-rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !rule.active }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast('success', rule.active ? 'Rule deactivated' : 'Rule activated')
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
    }
  }

  if (loading) {
    return (
      <div>
        <Header title="Pricing Rules" subtitle="Loading..." />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Header title="Pricing Rules" />
        <div className="p-6 flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-red-400 text-sm">{error}</p>
          <Link href="/login" className="text-[var(--accent)] text-sm hover:underline">Go to Login</Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmDeleteRule}
        title="Delete Pricing Rule"
        message={`Delete this pricing rule? This action cannot be undone.`}
        variant="danger"
        loading={!!deleting}
      />
      <Header title="Pricing Rules" subtitle="Manage profit margins and pricing" />
      <div className="p-6 space-y-6">
        <div className="flex justify-end">
          <GlassButton size="sm" onClick={() => openCreate('fixed')}><Plus size={16} /> Add Rule</GlassButton>
        </div>

        <Tabs
          tabs={[
            { key: 'global', label: 'Global Rules', icon: <DollarSign size={14} /> },
            { key: 'category', label: 'Category Rules', icon: <Tag size={14} />, badge: categoryRules.length },
            { key: 'supplier', label: 'Supplier Rules', icon: <Truck size={14} />, badge: supplierRules.length },
            { key: 'preview', label: 'Preview', icon: <Calculator size={14} /> },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

        {/* Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="glass p-6 w-full max-w-md mx-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-[var(--foreground)]">{editing ? 'Edit Pricing Rule' : 'Add Pricing Rule'}</h3>
                  <button onClick={() => setShowModal(false)} className="text-[var(--muted)] hover:text-[var(--foreground)]"><X size={20} /></button>
                </div>
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-xs text-[var(--muted)] mb-1">Rule Type</label>
                    <GlassDropdown
                      options={[
                        { value: 'fixed', label: 'Fixed Amount ($)' },
                        { value: 'percentage', label: 'Percentage (%)' },
                        { value: 'category', label: 'Category Rule' },
                        { value: 'supplier', label: 'Supplier Rule' },
                      ]}
                      value={form.type}
                      onChange={(v) => setForm({ ...form, type: v })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[var(--muted)] mb-1">Value</label>
                    <div className="relative">
                      <input
                        className="glass-input w-full pr-10"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={form.type === 'percentage' ? 'e.g. 15' : 'e.g. 5.00'}
                        value={form.value}
                        onChange={(e) => setForm({ ...form, value: e.target.value })}
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">
                        {form.type === 'percentage' ? '%' : 'USD'}
                      </span>
                    </div>
                  </div>

                  {form.type === 'category' && (
                    <div>
                      <label className="block text-xs text-[var(--muted)] mb-1">Category</label>
                      <GlassDropdown
                        options={[{ value: '', label: 'Select category' }, ...categories.map((c: CategoryItem) => ({ value: c.name, label: c.name }))]}
                        value={form.category}
                        onChange={(v) => setForm({ ...form, category: v })}
                      />
                    </div>
                  )}

                  {form.type === 'supplier' && (
                    <div>
                      <label className="block text-xs text-[var(--muted)] mb-1">Supplier</label>
                      <GlassDropdown
                        options={[{ value: '', label: 'Select supplier' }, ...suppliers.map((s: SupplierItem) => ({ value: s.id, label: s.name }))]}
                        value={form.providerId}
                        onChange={(v) => setForm({ ...form, providerId: v })}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[var(--muted)] mb-1">Currency</label>
                      <GlassDropdown
                        options={[
                          { value: 'USD', label: 'USD' },
                          { value: 'BDT', label: 'BDT' },
                          { value: 'EUR', label: 'EUR' },
                          { value: 'GBP', label: 'GBP' },
                        ]}
                        value={form.currency}
                        onChange={(v) => setForm({ ...form, currency: v })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--muted)] mb-1">Status</label>
                      <button
                        type="button"
                        className="flex items-center gap-2 mt-2 text-sm text-[var(--foreground)]"
                        onClick={() => setForm({ ...form, active: !form.active })}
                      >
                        {form.active ? (
                          <ToggleRight size={24} className="text-green-400" />
                        ) : (
                          <ToggleLeft size={24} className="text-[var(--muted)]" />
                        )}
                        {form.active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <GlassButton type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancel</GlassButton>
                    <GlassButton type="submit" className="flex-1" disabled={saving}>
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />}
                      {editing ? 'Update' : 'Create'}
                    </GlassButton>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Rules Tab */}
        {activeTab === 'global' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--foreground)]">Global Profit Rules</h3>
              <div className="flex gap-2">
                <GlassButton size="sm" variant="secondary" onClick={() => openCreate('fixed')}>
                  <DollarSign size={14} /> Fixed
                </GlassButton>
                <GlassButton size="sm" variant="secondary" onClick={() => openCreate('percentage')}>
                  <Percent size={14} /> Percentage
                </GlassButton>
              </div>
            </div>
            {globalRules.length === 0 ? (
              <GlassCard className="text-center py-10">
                <DollarSign size={32} className="mx-auto text-[var(--muted)] mb-3" />
                <p className="text-sm text-[var(--muted)]">No global rules configured yet.</p>
                <p className="text-xs text-[var(--muted)] mt-1">Add a fixed or percentage profit rule to apply globally.</p>
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {globalRules.map((rule: PricingRule, i: number) => (
                  <motion.div key={rule.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <GlassCard className="h-full">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${rule.type === 'fixed' ? 'bg-green-500/10' : 'bg-blue-500/10'}`}>
                            {rule.type === 'fixed' ? <DollarSign size={18} className="text-green-400" /> : <Percent size={18} className="text-blue-400" />}
                          </div>
                          <div>
                            <h4 className="font-bold text-[var(--foreground)]">
                              {rule.type === 'fixed' ? `+$${rule.value.toFixed(2)}` : `+${rule.value}%`}
                            </h4>
                            <p className="text-xs text-[var(--muted)]">
                              {rule.type === 'fixed' ? 'Fixed Profit' : 'Percentage Profit'}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={rule.active ? 'active' : 'inactive'} />
                      </div>
                      <div className="space-y-1.5 text-sm mb-4">
                        <div className="flex justify-between">
                          <span className="text-[var(--muted)]">Type</span>
                          <span className="text-[var(--foreground)] font-medium capitalize">{rule.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--muted)]">Value</span>
                          <span className="text-[var(--foreground)] font-bold">
                            {rule.type === 'fixed' ? `$${rule.value.toFixed(2)}` : `${rule.value}%`}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--muted)]">Currency</span>
                          <span className="text-[var(--foreground)]">{rule.currency || 'USD'}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-3 border-t border-[var(--card-border)]">
                        <GlassButton variant="ghost" size="sm" className="flex-1" onClick={() => toggleActive(rule)}>
                          {rule.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                          {rule.active ? 'Active' : 'Inactive'}
                        </GlassButton>
                        <GlassButton variant="secondary" size="sm" onClick={() => openEdit(rule)}><Edit size={14} /></GlassButton>
                        <GlassButton variant="danger" size="sm" onClick={() => handleDeleteRule(rule.id, `${rule.type} rule`)} disabled={deleting === rule.id}>
                          {deleting === rule.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </GlassButton>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Category Rules Tab */}
        {activeTab === 'category' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--foreground)]">Category-Specific Pricing</h3>
              <GlassButton size="sm" onClick={() => openCreate('category')}><Plus size={14} /> Add Rule</GlassButton>
            </div>
            {categoryRules.length === 0 ? (
              <GlassCard className="text-center py-10">
                <Tag size={32} className="mx-auto text-[var(--muted)] mb-3" />
                <p className="text-sm text-[var(--muted)]">No category rules configured yet.</p>
                <p className="text-xs text-[var(--muted)] mt-1">Add rules per service category (e.g. Apple, Samsung).</p>
              </GlassCard>
            ) : (
              <div className="space-y-3">
                {categoryRules.map((rule: PricingRule, i: number) => (
                  <motion.div key={rule.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <GlassCard>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-xl bg-indigo-500/10">
                            <Tag size={18} className="text-indigo-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-[var(--foreground)]">{rule.category || 'All Categories'}</h4>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-[var(--muted)]">
                                {rule.type === 'fixed' ? `+$${rule.value.toFixed(2)}` : `+${rule.value}%`}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--muted)] mt-0.5">
                              {rule.type === 'fixed' ? 'Fixed margin' : 'Percentage margin'} · {rule.currency || 'USD'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={rule.active ? 'active' : 'inactive'} />
                          <div className="flex gap-1">
                            <button onClick={() => toggleActive(rule)} className="p-1.5 rounded hover:bg-white/10 text-[var(--muted)]">
                              {rule.active ? <ToggleRight size={16} className="text-green-400" /> : <ToggleLeft size={16} />}
                            </button>
                            <button onClick={() => openEdit(rule)} className="p-1.5 rounded hover:bg-white/10 text-[var(--muted)]"><Edit size={14} /></button>
                            <button onClick={() => handleDeleteRule(rule.id, `category: ${rule.category}`)} className="p-1.5 rounded hover:bg-red-500/10 text-red-400">
                              {deleting === rule.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Supplier Rules Tab */}
        {activeTab === 'supplier' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--foreground)]">Supplier-Specific Pricing</h3>
              <GlassButton size="sm" onClick={() => openCreate('supplier')}><Plus size={14} /> Add Rule</GlassButton>
            </div>
            {supplierRules.length === 0 ? (
              <GlassCard className="text-center py-10">
                <Truck size={32} className="mx-auto text-[var(--muted)] mb-3" />
                <p className="text-sm text-[var(--muted)]">No supplier rules configured yet.</p>
                <p className="text-xs text-[var(--muted)] mt-1">Add per-supplier profit margins.</p>
              </GlassCard>
            ) : (
              <div className="space-y-3">
                {supplierRules.map((rule: PricingRule, i: number) => {
                  const supplierName = suppliers.find((s: SupplierItem) => s.id === rule.providerId)?.name || 'Unknown'
                  return (
                    <motion.div key={rule.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <GlassCard>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-xl bg-amber-500/10">
                              <Truck size={18} className="text-amber-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-[var(--foreground)]">{supplierName}</h4>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-[var(--muted)]">
                                  {rule.type === 'fixed' ? `+$${rule.value.toFixed(2)}` : `+${rule.value}%`}
                                </span>
                              </div>
                              <p className="text-xs text-[var(--muted)] mt-0.5">
                                {rule.type === 'fixed' ? 'Fixed margin' : 'Percentage margin'} · {rule.currency || 'USD'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <StatusBadge status={rule.active ? 'active' : 'inactive'} />
                            <div className="flex gap-1">
                              <button onClick={() => toggleActive(rule)} className="p-1.5 rounded hover:bg-white/10 text-[var(--muted)]">
                                {rule.active ? <ToggleRight size={16} className="text-green-400" /> : <ToggleLeft size={16} />}
                              </button>
                              <button onClick={() => openEdit(rule)} className="p-1.5 rounded hover:bg-white/10 text-[var(--muted)]"><Edit size={14} /></button>
                              <button onClick={() => handleDeleteRule(rule.id, `supplier rule`)} className="p-1.5 rounded hover:bg-red-500/10 text-red-400">
                                {deleting === rule.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[var(--foreground)]">Live Price Calculator</h3>
            <GlassCard>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[var(--muted)] mb-1">Supplier Cost ($)</label>
                    <input
                      className="glass-input w-full"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 10.00"
                      value={calcForm.supplierCost}
                      onChange={(e) => setCalcForm({ ...calcForm, supplierCost: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--muted)] mb-1">Category (optional)</label>
                    <GlassDropdown
                      options={[{ value: '', label: 'Any Category' }, ...categories.map((c: CategoryItem) => ({ value: c.id, label: c.name }))]}
                      value={calcForm.categoryId}
                      onChange={(v) => setCalcForm({ ...calcForm, categoryId: v })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--muted)] mb-1">Supplier (optional)</label>
                    <GlassDropdown
                      options={[{ value: '', label: 'Any Supplier' }, ...suppliers.map((s: SupplierItem) => ({ value: s.id, label: s.name }))]}
                      value={calcForm.supplierId}
                      onChange={(v) => setCalcForm({ ...calcForm, supplierId: v })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--muted)] mb-1">Override Profit Type (optional)</label>
                    <GlassDropdown
                      options={[
                        { value: '', label: 'Use Active Rules' },
                        { value: 'fixed', label: 'Fixed Amount ($)' },
                        { value: 'percentage', label: 'Percentage (%)' },
                      ]}
                      value={calcForm.profitType}
                      onChange={(v) => setCalcForm({ ...calcForm, profitType: v })}
                    />
                  </div>
                </div>
                {calcForm.profitType && (
                  <div className="max-w-xs">
                    <label className="block text-xs text-[var(--muted)] mb-1">Override Value</label>
                    <input
                      className="glass-input w-full"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={calcForm.profitType === 'percentage' ? 'e.g. 15' : 'e.g. 5.00'}
                      value={calcForm.profitValue}
                      onChange={(e) => setCalcForm({ ...calcForm, profitValue: e.target.value })}
                    />
                  </div>
                )}
                <GlassButton onClick={handleCalculate} disabled={calculating || !calcForm.supplierCost}>
                  {calculating ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />}
                  Calculate Price
                </GlassButton>
              </div>
            </GlassCard>

            <AnimatePresence>
              {calcResult && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <GlassCard>
                    <h4 className="text-sm font-bold text-[var(--foreground)] mb-4">Calculation Result</h4>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-4 rounded-xl bg-white/5">
                        <p className="text-xs text-[var(--muted)] mb-1">Supplier Cost</p>
                        <p className="text-xl font-bold text-[var(--foreground)]">${calcResult.supplierCost.toFixed(2)}</p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-green-500/10">
                        <p className="text-xs text-[var(--muted)] mb-1">Profit</p>
                        <p className="text-xl font-bold text-green-400">+${calcResult.profit.toFixed(2)}</p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-blue-500/10">
                        <p className="text-xs text-[var(--muted)] mb-1">Selling Price</p>
                        <p className="text-xl font-bold text-blue-400">${calcResult.sellingPrice.toFixed(2)}</p>
                      </div>
                    </div>
                    {calcResult.appliedRules && calcResult.appliedRules.length > 0 && (
                      <div className="p-3 rounded-xl bg-white/5">
                        <p className="text-xs text-[var(--muted)] mb-2 font-medium">Applied Rules:</p>
                        <div className="flex flex-wrap gap-2">
                          {calcResult.appliedRules.map((rule: string, idx: number) => (
                            <span key={idx} className="text-[10px] px-2 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                              {rule}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>

            {rules.length > 0 && (
              <GlassCard>
                <h4 className="text-sm font-bold text-[var(--foreground)] mb-3">Active Rules Summary</h4>
                <div className="space-y-2">
                  {rules.filter((r: PricingRule) => r.active).map((rule: PricingRule) => {
                    let label = rule.type
                    if (rule.type === 'category') label = `Category: ${rule.category}`
                    if (rule.type === 'supplier') {
                      const sName = suppliers.find((s: SupplierItem) => s.id === rule.providerId)?.name
                      label = `Supplier: ${sName || rule.providerId}`
                    }
                    return (
                      <div key={rule.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 text-sm">
                        <span className="text-[var(--foreground)]">{label}</span>
                        <span className="font-bold text-[var(--foreground)]">
                          {rule.type === 'fixed' ? `+$${rule.value.toFixed(2)}` : `+${rule.value}%`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </GlassCard>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
