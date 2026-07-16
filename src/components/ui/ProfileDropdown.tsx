'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Wallet, Lock, Settings, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { ChangePasswordModal } from '@/components/ui/ChangePasswordModal'
import { Dropdown } from '@/components/ui/Dropdown'

export function ProfileDropdown() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
      toast('success', 'Logged out successfully')
      router.push('/login')
    } catch {
      toast('error', 'Failed to logout')
    } finally {
      setLoggingOut(false)
    }
  }

  if (loading || !user) return null

  const initial = user.name?.charAt(0)?.toUpperCase() || 'U'
  const dashboardPath = user.role === 'admin' ? '/admin/dashboard' : '/reseller/dashboard'
  const walletPath = user.role === 'admin' ? '/admin/wallet' : '/reseller/wallet'
  const roleLabel = user.role === 'admin' ? 'Admin' : 'Reseller'

  const menuBg = {
    background: 'var(--card-bg)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderColor: 'var(--card-border)',
  }

  return (
    <>
      <Dropdown
        open={open}
        onToggle={setOpen}
        align="right"
        menuClassName="w-64 p-0"
      >
        <button
          onClick={() => setOpen(!open)}
          className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 cursor-pointer text-white text-sm font-bold hover:shadow-indigo-500/40 transition-shadow"
        >
          {initial}
        </button>

        {open && (
          <div
            className="absolute right-0 top-full mt-2 w-64 border rounded-xl shadow-xl z-[9999]"
            style={menuBg}
          >
            {/* Header */}
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)] truncate">{user.name}</p>
                  <p className="text-xs text-[var(--muted)] truncate">{user.email}</p>
                  <p className="text-xs font-medium" style={{ color: 'var(--accent)' }}>{roleLabel}</p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <button
                onClick={() => { setOpen(false); router.push(dashboardPath) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--foreground)] transition-colors cursor-pointer"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <User size={16} className="text-[var(--muted)]" />
                My Profile
              </button>
              <button
                onClick={() => { setOpen(false); router.push(walletPath) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--foreground)] transition-colors cursor-pointer"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <Wallet size={16} className="text-[var(--muted)]" />
                Wallet Balance
              </button>
              <button
                onClick={() => { setOpen(false); setShowPasswordModal(true) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--foreground)] transition-colors cursor-pointer"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <Lock size={16} className="text-[var(--muted)]" />
                Change Password
              </button>
              <button
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--foreground)] transition-colors cursor-pointer"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <Settings size={16} className="text-[var(--muted)]" />
                Security Settings
              </button>
            </div>

            {/* Divider + Logout */}
            <div className="py-1" style={{ borderTop: '1px solid var(--card-border)' }}>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 transition-colors cursor-pointer"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <LogOut size={16} />
                {loggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        )}
      </Dropdown>

      <ChangePasswordModal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </>
  )
}
