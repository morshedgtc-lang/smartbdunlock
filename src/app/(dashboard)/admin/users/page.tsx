'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useToast } from '@/components/ui/Toast'
import { useApi } from '@/hooks/useApi'
import { motion } from 'framer-motion'
import { Search, Plus, Edit, Ban, Eye, Users, Loader2, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  reseller: 'Reseller',
}

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'reseller', status: 'active' })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const { data, loading, error, refetch } = useApi<any>({ url: '/api/users' })
  const allUsers = data?.users || []

  const filtered = allUsers.filter((u: any) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const openCreate = () => { setEditing(null); setForm({ name: '', email: '', phone: '', password: '', role: 'reseller', status: 'active' }); setShowModal(true) }
  const openEdit = (user: any) => {
    setEditing(user)
    setForm({ name: user.name, email: user.email, phone: user.phone || '', password: '', role: user.role, status: user.status })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        const body: any = { id: editing.id, name: form.name, phone: form.phone, role: form.role, status: form.status }
        if (form.password) body.password = form.password
        const res = await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        toast('success', 'User updated')
      } else {
        if (!form.password) { toast('error', 'Password is required'); setSaving(false); return }
        const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        toast('success', 'User created')
      }
      setShowModal(false)
      refetch()
    } catch (err: any) {
      toast('error', err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusToggle = async (user: any) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active'
    try {
      const res = await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: user.id, status: newStatus }) })
      if (!res.ok) throw new Error('Failed')
      toast('success', `User ${newStatus}`)
      refetch()
    } catch (err: any) {
      toast('error', err.message)
    }
  }

  const handleDelete = async (user: any) => {
    if (!confirm(`Delete user "${user.name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/users?id=${user.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast('success', 'User deleted')
      refetch()
    } catch (err: any) {
      toast('error', err.message)
    }
  }

  if (loading) {
    return (
      <div>
        <Header title="User Management" subtitle="Loading..." />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Header title="User Management" />
        <div className="p-6 flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-red-400 text-sm">{error}</p>
          <Link href="/login" className="text-[var(--accent)] text-sm hover:underline">Go to Login</Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="User Management" subtitle={`${allUsers.length} total users`} />
      <div className="p-6 space-y-6">
        <motion.div className="glass p-4" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <div className="relative flex-1 w-full md:max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input className="glass-input-search" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['ALL', 'admin', 'reseller'].map(r => (
                <button key={r} className={`filter-pill ${roleFilter === r ? 'active' : ''}`} onClick={() => setRoleFilter(r)}>
                  {r === 'ALL' ? 'All Roles' : roleLabels[r] || r}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Admins', count: allUsers.filter((u: any) => u.role === 'admin').length, color: 'text-blue-500' },
            { label: 'Resellers', count: allUsers.filter((u: any) => u.role === 'reseller').length, color: 'text-purple-500' },
            { label: 'Total Balance', count: `$${allUsers.reduce((sum: number, u: any) => sum + (u.walletBalance || 0), 0).toLocaleString()}`, color: 'text-amber-500' },
          ].map(s => (
            <div key={s.label} className="glass p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-xs text-[var(--muted)]">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <GlassButton size="sm" onClick={openCreate}><Plus size={16} /> Add User</GlassButton>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div className="glass p-6 w-full max-w-md mx-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--foreground)]">{editing ? 'Edit User' : 'Add User'}</h3>
                <button onClick={() => setShowModal(false)} className="text-[var(--muted)] hover:text-[var(--foreground)]"><X size={20} /></button>
              </div>
              <form onSubmit={handleSave} className="space-y-3">
                <input className="glass-input w-full" placeholder="Full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                <input className="glass-input w-full" type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required disabled={!!editing} />
                <input className="glass-input w-full" placeholder="Phone (optional)" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                <input className="glass-input w-full" type="password" placeholder={editing ? 'New password (leave blank to keep)' : 'Password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={!editing} minLength={8} />
                <div className="grid grid-cols-2 gap-3">
                  <select className="glass-input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    <option value="reseller">Reseller</option>
                    <option value="admin">Admin</option>
                  </select>
                  <select className="glass-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <GlassButton type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancel</GlassButton>
                  <GlassButton type="submit" className="flex-1" disabled={saving}>
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    {editing ? 'Update' : 'Create'}
                  </GlassButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Table */}
        <GlassCard padding="p-0">
          <div className="table-responsive">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">User</th>
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Role</th>
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">Status</th>
                  <th className="text-right py-4 px-4 text-[var(--muted)] font-medium">Balance</th>
                  <th className="text-right py-4 px-4 text-[var(--muted)] font-medium">Orders</th>
                  <th className="text-right py-4 px-4 text-[var(--muted)] font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <Users size={40} className="mx-auto text-[var(--muted)] mb-3 opacity-50" />
                      <p className="text-[var(--muted)]">No users found</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((user: any, i: number) => (
                    <motion.tr key={user.id} className="border-b border-[var(--card-border)] hover:bg-white/5 dark:hover:bg-white/5 transition-colors" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-[var(--foreground)]">{user.name}</p>
                          <p className="text-xs text-[var(--muted)]">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-medium px-2 py-1 rounded-lg bg-white/5 dark:bg-white/5">{roleLabels[user.role] || user.role}</span>
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={user.status} /></td>
                      <td className="py-3 px-4 text-right font-medium text-[var(--foreground)]">${user.walletBalance?.toLocaleString() || '0'}</td>
                      <td className="py-3 px-4 text-right text-[var(--foreground)]">{user._count?.orders || 0}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer" onClick={() => openEdit(user)}>
                            <Edit size={14} />
                          </button>
                          <button className={`p-1.5 rounded-lg hover:bg-white/10 text-[var(--muted)] transition-colors cursor-pointer ${user.status === 'active' ? 'hover:text-red-500' : 'hover:text-emerald-500'}`} onClick={() => handleStatusToggle(user)}>
                            {user.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </td>
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
