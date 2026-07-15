'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { useToast } from '@/components/ui/Toast'
import { motion } from 'framer-motion'
import { Plus, Edit, Trash2, Search, Loader2, X, Package, Settings, GripVertical, ChevronUp, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select' },
  { value: 'multiselect', label: 'Multi Select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'file', label: 'File Upload' },
  { value: 'image', label: 'Image Upload' },
  { value: 'imei_single', label: 'Single IMEI' },
  { value: 'imei_multi', label: 'Multi IMEI' },
  { value: 'serial_single', label: 'Single Serial Number' },
  { value: 'serial_multi', label: 'Multi Serial Number' },
]

const emptyService = { name: '', description: '', type: 'unlock', cost: '', sellingPrice: '', processingTime: '', supplierId: '', status: 'active', categoryId: '', clientVisible: true }
const emptyField = { fieldType: 'text', label: '', placeholder: '', options: '', required: false, visibleToClient: true }

export default function ServicesPage() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(emptyService)
  const [customFields, setCustomFields] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { toast } = useToast()
  const { data, loading, error, refetch } = useApi<any>({ url: '/api/services' })
  const { data: suppliersData } = useApi<any>({ url: '/api/suppliers' })
  const { data: catData, refetch: refetchCats } = useApi<any>({ url: '/api/service-categories' })
  const allServices = data?.services || []
  const suppliers = suppliersData?.suppliers || []
  const categories = catData?.categories || []

  const filtered = allServices.filter((s: any) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.type.toLowerCase().includes(search.toLowerCase())
    const matchCat = !categoryFilter || s.categoryId === categoryFilter
    return matchSearch && matchCat
  })

  const openCreate = () => { setEditing(null); setForm(emptyService); setCustomFields([]); setShowModal(true) }
  const openEdit = (service: any) => {
    setEditing(service)
    setForm({
      name: service.name,
      description: service.description || '',
      type: service.type,
      cost: String(service.cost),
      sellingPrice: String(service.sellingPrice),
      processingTime: service.processingTime || '',
      supplierId: service.supplierId || '',
      status: service.status,
      categoryId: service.categoryId || '',
      clientVisible: service.clientVisible !== false,
    })
    setCustomFields(
      (service.customFields || []).map((f: any) => ({
        ...f,
        options: f.options ? (typeof f.options === 'string' ? f.options : JSON.stringify(f.options)) : '',
      }))
    )
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        ...form,
        cost: parseFloat(form.cost),
        sellingPrice: parseFloat(form.sellingPrice),
        supplierId: form.supplierId || undefined,
        categoryId: form.categoryId || undefined,
        clientVisible: form.clientVisible,
        customFields: customFields.map((f, i) => ({
          ...f,
          options: f.options ? f.options.split('\n').filter(Boolean) : undefined,
          order: i,
        })),
      }
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch('/api/services', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { id: editing.id, ...body } : body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast('success', editing ? 'Service updated' : 'Service created')
      setShowModal(false)
      refetch()
    } catch (err: any) {
      toast('error', err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete service "${name}"? This will also remove all custom fields.`)) return
    setDeleting(id)
    try {
      const res = await fetch('/api/services', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast('success', 'Service deleted')
      refetch()
    } catch (err: any) {
      toast('error', err.message)
    } finally {
      setDeleting(null)
    }
  }

  const addField = () => {
    setCustomFields([...customFields, { ...emptyField, id: `new-${Date.now()}` }])
  }

  const updateField = (index: number, data: any) => {
    const updated = [...customFields]
    updated[index] = { ...updated[index], ...data }
    setCustomFields(updated)
  }

  const removeField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index))
  }

  const moveField = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= customFields.length) return
    const updated = [...customFields]
    const [moved] = updated.splice(index, 1)
    updated.splice(newIndex, 0, moved)
    setCustomFields(updated)
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
          <Link href="/login" className="text-[var(--accent)] text-sm hover:underline">Go to Login</Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Services" subtitle={`${allServices.length} services`} />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-3 flex-wrap">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input className="glass-input pl-9 w-64" placeholder="Search services..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="glass-input w-auto" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <GlassButton size="sm" variant="secondary" onClick={() => setShowCatModal(true)}><Settings size={16} /> Categories</GlassButton>
            <GlassButton size="sm" onClick={openCreate}><Plus size={16} /> Add Service</GlassButton>
          </div>
        </div>

        {/* Category Management Modal */}
        {showCatModal && (
          <CategoryModal
            categories={categories}
            onClose={() => setShowCatModal(false)}
            refetch={refetchCats}
            toast={toast}
          />
        )}

        {/* Service Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div className="glass p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--foreground)]">{editing ? 'Edit Service' : 'Add Service'}</h3>
                <button onClick={() => setShowModal(false)} className="text-[var(--muted)] hover:text-[var(--foreground)]"><X size={20} /></button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                {/* Basic Info */}
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1">Category</label>
                  <select className="glass-input w-full" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                    <option value="">No Category</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <input className="glass-input w-full" placeholder="Service name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                <textarea className="glass-input w-full h-16 resize-none" placeholder="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />

                <div className="grid grid-cols-2 gap-3">
                  <select className="glass-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="unlock">Unlock</option>
                    <option value="flash">Flash</option>
                    <option value="repair">Repair</option>
                    <option value="imei">IMEI Check</option>
                  </select>
                  <select className="glass-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-[var(--card-border)] cursor-pointer hover:bg-white/8 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.clientVisible}
                    onChange={e => setForm({ ...form, clientVisible: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <div>
                    <span className="text-sm font-medium text-[var(--foreground)]">Visible to Clients</span>
                    <p className="text-xs text-[var(--muted)]">Toggle whether clients can see and order this service</p>
                  </div>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[var(--muted)] mb-1">Cost Price ($)</label>
                    <input className="glass-input w-full" type="number" step="0.01" min="0" placeholder="0.00" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--muted)] mb-1">Selling Price ($)</label>
                    <input className="glass-input w-full" type="number" step="0.01" min="0" placeholder="0.00" value={form.sellingPrice} onChange={e => setForm({ ...form, sellingPrice: e.target.value })} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input className="glass-input w-full" placeholder="Processing time (e.g. 24-48 hours)" value={form.processingTime} onChange={e => setForm({ ...form, processingTime: e.target.value })} />
                  <select className="glass-input w-full" value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })}>
                    <option value="">No supplier</option>
                    {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                {form.cost && form.sellingPrice && (
                  <div className="p-3 rounded-xl bg-white/5 text-sm">
                    <span className="text-[var(--muted)]">Profit: </span>
                    <span className="font-bold text-green-500">${(parseFloat(form.sellingPrice) - parseFloat(form.cost)).toFixed(2)}</span>
                  </div>
                )}

                {/* Custom Fields Section */}
                <div className="border-t border-[var(--card-border)] pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-[var(--foreground)]">Custom Fields</h4>
                    <GlassButton type="button" size="sm" variant="secondary" onClick={addField}><Plus size={14} /> Add Field</GlassButton>
                  </div>
                  <p className="text-xs text-[var(--muted)] mb-3">Add IMEI, serial number, file upload, or image fields for this service.</p>

                  {customFields.length === 0 && (
                    <div className="p-4 text-center text-sm text-[var(--muted)] border border-dashed border-[var(--card-border)] rounded-xl">
                      No custom fields yet. Click &quot;Add Field&quot; to start.
                    </div>
                  )}

                  <div className="space-y-3">
                    {customFields.map((field, index) => (
                      <div key={field.id || index} className="p-4 rounded-xl bg-white/5 border border-[var(--card-border)]">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <GripVertical size={14} className="text-[var(--muted)] cursor-move" />
                            <span className="text-xs font-medium text-[var(--muted)]">Field {index + 1}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => moveField(index, -1)} className="p-1 rounded hover:bg-white/10 text-[var(--muted)]" disabled={index === 0}>
                              <ChevronUp size={14} />
                            </button>
                            <button type="button" onClick={() => moveField(index, 1)} className="p-1 rounded hover:bg-white/10 text-[var(--muted)]" disabled={index === customFields.length - 1}>
                              <ChevronDown size={14} />
                            </button>
                            <button type="button" onClick={() => removeField(index)} className="p-1 rounded hover:bg-red-500/10 text-red-400">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs text-[var(--muted)] mb-1">Field Type</label>
                            <select className="glass-input w-full text-sm" value={field.fieldType} onChange={e => updateField(index, { fieldType: e.target.value })}>
                              {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-[var(--muted)] mb-1">Label</label>
                            <input className="glass-input w-full text-sm" placeholder="e.g. IMEI Numbers" value={field.label} onChange={e => updateField(index, { label: e.target.value })} required />
                          </div>
                        </div>

                        {['select', 'multiselect'].includes(field.fieldType) && (
                          <div className="mb-3">
                            <label className="block text-xs text-[var(--muted)] mb-1">Options (one per line)</label>
                            <textarea className="glass-input w-full h-16 text-sm resize-none" placeholder={"Option 1\nOption 2\nOption 3"} value={field.options} onChange={e => updateField(index, { options: e.target.value })} />
                          </div>
                        )}

                        <div>
                          <label className="block text-xs text-[var(--muted)] mb-1">Placeholder</label>
                          <input className="glass-input w-full text-sm" placeholder="Placeholder text" value={field.placeholder} onChange={e => updateField(index, { placeholder: e.target.value })} />
                        </div>

                        <div className="flex items-center gap-4 mt-3">
                          <label className="flex items-center gap-2 text-xs text-[var(--muted)] cursor-pointer">
                            <input type="checkbox" checked={field.required} onChange={e => updateField(index, { required: e.target.checked })} className="rounded" />
                            Required
                          </label>
                          <label className="flex items-center gap-2 text-xs text-[var(--muted)] cursor-pointer">
                            <input type="checkbox" checked={field.visibleToClient} onChange={e => updateField(index, { visibleToClient: e.target.checked })} className="rounded" />
                            Visible to client
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <GlassButton type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancel</GlassButton>
                  <GlassButton type="submit" className="flex-1" disabled={saving}>
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
                    {editing ? 'Update' : 'Create'}
                  </GlassButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((service: any, i: number) => (
            <motion.div key={service.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <GlassCard className="h-full">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-[var(--foreground)]">{service.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {service.category && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400">{service.category.name}</span>
                      )}
                      <span className="text-xs text-[var(--muted)]">{service.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${service.clientVisible !== false ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>
                      {service.clientVisible !== false ? '👁 Visible' : '🙈 Hidden'}
                    </span>
                    <StatusBadge status={service.status} />
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Cost Price</span>
                    <span className="text-[var(--foreground)] font-medium">${service.cost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Selling Price</span>
                    <span className="text-green-500 font-bold">${service.sellingPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Profit</span>
                    <span className="text-[var(--foreground)]">${(service.sellingPrice - service.cost).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Processing</span>
                    <span className="text-[var(--foreground)]">{service.processingTime || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Supplier</span>
                    <span className="text-[var(--foreground)]">{service.supplier?.name || '—'}</span>
                  </div>
                  {service.customFields && service.customFields.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">Custom Fields</span>
                      <span className="text-[var(--foreground)]">{service.customFields.length}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--card-border)]">
                  <GlassButton variant="secondary" size="sm" className="flex-1" onClick={() => openEdit(service)}><Edit size={14} /> Edit</GlassButton>
                  <GlassButton variant="danger" size="sm" onClick={() => handleDelete(service.id, service.name)} disabled={deleting === service.id}>
                    {deleting === service.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </GlassButton>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CategoryModal({ categories, onClose, refetch, toast }: { categories: any[]; onClose: () => void; refetch: () => void; toast: any }) {
  const [newCatName, setNewCatName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!newCatName.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/service-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast('success', 'Category created')
      setNewCatName('')
      refetch()
    } catch (err: any) {
      toast('error', err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/service-categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: editingName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast('success', 'Category updated')
      setEditingId(null)
      refetch()
    } catch (err: any) {
      toast('error', err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"?`)) return
    try {
      const res = await fetch(`/api/service-categories?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast('success', 'Category deleted')
      refetch()
    } catch (err: any) {
      toast('error', err.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div className="glass p-6 w-full max-w-md mx-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--foreground)]">Manage Categories</h3>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)]"><X size={20} /></button>
        </div>

        <div className="flex gap-2 mb-4">
          <input className="glass-input flex-1" placeholder="New category name" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} />
          <GlassButton size="sm" onClick={handleCreate} disabled={saving || !newCatName.trim()}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          </GlassButton>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {categories.map((cat: any) => (
            <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              {editingId === cat.id ? (
                <input className="glass-input flex-1 mr-2 text-sm" value={editingName} onChange={e => setEditingName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUpdate(cat.id)} autoFocus />
              ) : (
                <div>
                  <span className="text-sm font-medium text-[var(--foreground)]">{cat.name}</span>
                  <span className="text-xs text-[var(--muted)] ml-2">({cat._count?.services || 0} services)</span>
                </div>
              )}
              <div className="flex gap-1">
                {editingId === cat.id ? (
                  <GlassButton size="sm" variant="secondary" onClick={() => handleUpdate(cat.id)}>Save</GlassButton>
                ) : (
                  <button onClick={() => { setEditingId(cat.id); setEditingName(cat.name) }} className="p-1.5 rounded hover:bg-white/10 text-[var(--muted)]"><Edit size={14} /></button>
                )}
                <button onClick={() => handleDelete(cat.id, cat.name)} className="p-1.5 rounded hover:bg-red-500/10 text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-center text-sm text-[var(--muted)] py-4">No categories yet. Create one above.</p>
          )}
        </div>
      </motion.div>
    </div>
  )
}
