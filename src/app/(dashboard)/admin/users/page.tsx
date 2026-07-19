'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassDropdown } from '@/components/ui/GlassDropdown'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { useApi } from '@/hooks/useApi'
import { motion } from 'framer-motion'
import { Search, Plus, Edit, Trash2, Loader2, X, ChevronLeft, ChevronRight, UserCheck, Shield, Wallet, Ban, UserMinus } from 'lucide-react'
import Link from 'next/link'
import { useState, useMemo } from 'react'

interface UserItem {
  id: string
  userId: string
  name: string
  email: string
  phone?: string
  role: string
  status: string
  walletBalance?: number
  _count?: { orders: number; transactions: number }
}

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  reseller: 'Client',
}

const PAGE_SIZE = 20

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<UserItem | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'reseller', status: 'active' })
  const [saving, setSaving] = useState(false)
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()
  const { data, loading, error, refetch } = useApi<{ users: UserItem[] }>({ url: '/api/users' })

  const filtered = useMemo(() => {
    const allUsers = data?.users || []
    return allUsers.filter((u: UserItem) => {
      const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || (u.userId && u.userId.toLowerCase().includes(search.toLowerCase()))
      const matchRole = roleFilter === 'ALL' || u.role === roleFilter
      return matchSearch && matchRole
    })
  }, [data?.users, search, roleFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const showingFrom = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const showingTo = Math.min(safePage * PAGE_SIZE, filtered.length)

  const userList = data?.users || []
  const adminsCount = userList.filter((u: UserItem) => u.role === 'admin').length
  const clientsCount = userList.filter((u: UserItem) => u.role === 'reseller').length
  const totalBalance = userList.reduce((sum: number, u: UserItem) => sum + (u.walletBalance || 0), 0)
  const suspendedCount = userList.filter((u: UserItem) => u.status === 'suspended').length

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', email: '', phone: '', password: '', role: 'reseller', status: 'active' })
    setShowModal(true)
  }

  const openEdit = (user: UserItem) => {
    setEditing(user)
    setForm({ name: user.name, email: user.email, phone: user.phone || '', password: '', role: user.role, status: user.status })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        const body: { id: string; name: string; phone: string; role: string; status: string; password?: string } = { id: editing.id, name: form.name, phone: form.phone, role: form.role, status: form.status }
        if (form.password) body.password = form.password
        const res = await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        toast('success', 'User updated')
      } else {
        if (!form.password) { toast('error', 'Password is required'); setSaving(false); return }
        const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        toast('success', 'User created')
      }
      setShowModal(false)
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingUser) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/users?id=${deletingUser.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast('success', `User "${deletingUser.name}" deleted`)
      setDeletingUser(null)
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setDeleting(false)
    }
  }

  const handleStatusToggle = async (user: UserItem) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active'
    try {
      const res = await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: user.id, status: newStatus }) })
      if (!res.ok) throw new Error('Failed')
      toast('success', `User ${newStatus}`)
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed')
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
      <Header title="User Management" subtitle={`${userList.length} total users`} />
      <div className="p-6 space-y-6">
        <motion.div className="glass p-4" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <div className="relative flex-1 w-full md:max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input className="glass-input-search" placeholder="Search by name, email or user ID..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['ALL', 'admin', 'reseller'].map(r => (
                <button key={r} className={`filter-pill ${roleFilter === r ? 'active' : ''}`} onClick={() => { setRoleFilter(r); setPage(1) }}>
                  {r === 'ALL' ? 'All Roles' : roleLabels[r] || r}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Admins', count: adminsCount, icon: Shield, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Clients', count: clientsCount, icon: UserCheck, color: 'text-purple-500', bg: 'bg-purple-500/10' },
            { label: 'Total Balance', count: `$${totalBalance.toLocaleString()}`, icon: Wallet, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Suspended', count: suspendedCount, icon: Ban, color: 'text-red-500', bg: 'bg-red-500/10' },
          ].map(s => (
            <motion.div key={s.label} className="glass p-3 text-center" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-2`}>
                <s.icon size={16} className={s.color} />
              </div>
              <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-xs text-[var(--muted)]">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="flex justify-end">
          <GlassButton size="sm" onClick={openCreate}><Plus size={16} /> Add User</GlassButton>
        </div>

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
                  <GlassDropdown
                    options={[
                      { value: 'reseller', label: 'Client' },
                      { value: 'admin', label: 'Admin' },
                    ]}
                    value={form.role}
                    onChange={(v) => setForm({ ...form, role: v })}
                  />
                  <GlassDropdown
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'suspended', label: 'Suspended' },
                    ]}
                    value={form.status}
                    onChange={(v) => setForm({ ...form, status: v })}
                  />
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

        <ConfirmDialog
          open={!!deletingUser}
          onClose={() => setDeletingUser(null)}
          onConfirm={handleDelete}
          title="Delete User"
          message={`Are you sure you want to delete "${deletingUser?.name}"? This action cannot be undone. All associated data will be removed.`}
          variant="danger"
          confirmLabel="Delete User"
          loading={deleting}
        />

        <GlassCard padding="p-0">
          <div className="table-responsive">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">User</th>
                  <th className="text-left py-4 px-4 text-[var(--muted)] font-medium">User ID</th>
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
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-[var(--muted)]/10 flex items-center justify-center">
                          <UserMinus size={28} className="text-[var(--muted)]" />
                        </div>
                        <div>
                          <p className="text-[var(--foreground)] font-medium mb-1">No users found</p>
                          {search || roleFilter !== 'ALL' ? (
                            <p className="text-xs text-[var(--muted)]">Try adjusting your search or filter criteria</p>
                          ) : (
                            <p className="text-xs text-[var(--muted)]">Get started by adding your first user</p>
                          )}
                        </div>
                        {search || roleFilter !== 'ALL' ? (
                          <GlassButton variant="secondary" size="sm" onClick={() => { setSearch(''); setRoleFilter('ALL'); setPage(1) }}>
                            Clear Filters
                          </GlassButton>
                        ) : (
                          <GlassButton size="sm" onClick={openCreate}>
                            <Plus size={14} /> Add User
                          </GlassButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((user: UserItem, i: number) => (
                    <motion.tr key={user.id} className="border-b border-[var(--card-border)] hover:bg-white/5 transition-colors" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-[var(--foreground)]">{user.name}</p>
                          <p className="text-xs text-[var(--muted)]">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-mono text-[var(--foreground)]">{user.userId || '—'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-medium px-2 py-1 rounded-lg bg-white/5">{roleLabels[user.role] || user.role}</span>
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={user.status} /></td>
                      <td className="py-3 px-4 text-right font-medium text-[var(--foreground)]">${user.walletBalance?.toLocaleString() || '0'}</td>
                      <td className="py-3 px-4 text-right text-[var(--foreground)]">{user._count?.orders || 0}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer" title="Edit" onClick={() => openEdit(user)}>
                            <Edit size={14} />
                          </button>
                          <button className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--muted)] hover:text-red-500 transition-colors cursor-pointer" title="Delete" onClick={() => setDeletingUser(user)}>
                            <Trash2 size={14} />
                          </button>
                          <button className={`p-1.5 rounded-lg hover:bg-white/10 text-[var(--muted)] transition-colors cursor-pointer text-xs ${user.status === 'active' ? 'hover:text-red-500' : 'hover:text-emerald-500'}`} onClick={() => handleStatusToggle(user)}>
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

          {filtered.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--card-border)]">
              <p className="text-xs text-[var(--muted)]">
                Showing {showingFrom}–{showingTo} of {filtered.length} users
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  disabled={safePage <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-[var(--muted)] tabular-nums">
                  {safePage} / {totalPages}
                </span>
                <button
                  className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
