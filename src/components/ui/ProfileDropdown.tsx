'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { User, Wallet, Lock, Settings, LogOut, ChevronRight } from 'lucide-react'
import { useAuth } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { ChangePasswordModal } from '@/components/ui/ChangePasswordModal'

export function ProfileDropdown() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const mouseGlowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  const handleMouseGlow = useCallback((e: React.MouseEvent) => {
    if (!panelRef.current || !mouseGlowRef.current) return
    const rect = panelRef.current.getBoundingClientRect()
    mouseGlowRef.current.style.left = `${e.clientX - rect.left}px`
    mouseGlowRef.current.style.top = `${e.clientY - rect.top}px`
    mouseGlowRef.current.style.opacity = '1'
  }, [])

  const handleMouseGlowLeave = useCallback(() => {
    if (mouseGlowRef.current) {
      mouseGlowRef.current.style.opacity = '0'
    }
  }, [])

  if (loading || !user) return null

  const initial = user.name?.charAt(0)?.toUpperCase() || 'U'
  const dashboardPath = user.role === 'admin' ? '/admin/dashboard' : '/reseller/dashboard'
  const walletPath = user.role === 'admin' ? '/admin/wallet' : '/reseller/wallet'
  const roleLabel = user.role === 'admin' ? 'Admin' : 'Reseller'

  return (
    <>
      <div className="relative" ref={wrapperRef}>
        <button
          onClick={() => setOpen(!open)}
          className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 cursor-pointer text-white text-sm font-bold hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all duration-300"
        >
          {initial}
        </button>

        {open && (
          <div
            ref={panelRef}
            className="absolute right-0 top-full mt-3 w-72 border rounded-2xl shadow-2xl z-[9999] overflow-hidden glass-dropdown-panel-enter"
            style={{
              background: 'var(--card-bg)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              borderColor: 'var(--card-border)',
              boxShadow: '0 8px 32px var(--shadow-color), 0 32px 80px var(--shadow-color), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
            onMouseMove={handleMouseGlow}
            onMouseLeave={handleMouseGlowLeave}
          >
            {/* Mouse glow */}
            <div ref={mouseGlowRef} className="dropdown-mouse-glow" aria-hidden="true" />
            {/* Specular edge */}
            <div className="dropdown-specular-left" aria-hidden="true" />

            {/* User Header */}
            <div
              className="relative z-[2] px-5 py-4"
              style={{ borderBottom: '1px solid var(--card-border)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-lg shadow-indigo-500/20">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)] truncate">{user.name}</p>
                  <p className="text-xs text-[var(--muted)] truncate">{user.email}</p>
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider" style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: 'var(--accent)',
                  }}>
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="relative z-[2] py-1.5 px-1.5">
              <MenuButton
                icon={<User size={16} />}
                label="My Profile"
                onClick={() => { setOpen(false); router.push(dashboardPath) }}
              />
              <MenuButton
                icon={<Wallet size={16} />}
                label="Wallet Balance"
                onClick={() => { setOpen(false); router.push(walletPath) }}
              />
              <MenuButton
                icon={<Lock size={16} />}
                label="Change Password"
                onClick={() => { setOpen(false); setShowPasswordModal(true) }}
              />
              <MenuButton
                icon={<Settings size={16} />}
                label="Security Settings"
                onClick={() => setOpen(false)}
              />
            </div>

            {/* Divider + Logout */}
            <div className="relative z-[2] py-1.5 px-1.5" style={{ borderTop: '1px solid var(--card-border)' }}>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 rounded-xl transition-all duration-200 cursor-pointer hover:bg-red-500/10"
              >
                <LogOut size={16} />
                <span className="flex-1 text-left">{loggingOut ? 'Logging out...' : 'Logout'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <ChangePasswordModal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </>
  )
}

function MenuButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--foreground)] rounded-xl transition-all duration-200 cursor-pointer hover:bg-[var(--accent)]/5 group"
    >
      <span className="text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors duration-200">
        {icon}
      </span>
      <span className="flex-1 text-left">{label}</span>
      <ChevronRight size={14} className="text-[var(--muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
    </button>
  )
}
