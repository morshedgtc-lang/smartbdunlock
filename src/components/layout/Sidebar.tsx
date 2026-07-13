'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Plug,
  Wallet,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Smartphone,
} from 'lucide-react'
import { useState, useEffect } from 'react'

const adminLinks = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/services', label: 'Services', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/suppliers', label: 'Suppliers', icon: Plug },
  { href: '/admin/wallet', label: 'Wallet', icon: Wallet },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

const resellerLinks = [
  { href: '/reseller/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/reseller/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/reseller/wallet', label: 'Wallet', icon: Wallet },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [userName, setUserName] = useState('')

  const role = pathname.startsWith('/admin') ? 'admin' : 'reseller'
  const links = role === 'admin' ? adminLinks : resellerLinks
  const roleLabel = role === 'admin' ? 'Super Admin' : 'Reseller'

  useEffect(() => {
    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(data => {
        setUserName(data?.user?.name || roleLabel)
      })
      .catch(() => setUserName(roleLabel))
  }, [roleLabel])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <motion.aside
      className="sidebar h-screen flex flex-col z-30"
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-3 border-b border-[var(--card-border)]">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
          <Smartphone size={18} className="text-white" />
        </div>
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <h1 className="font-bold text-lg text-[var(--foreground)] leading-none">SmartBD Unlock</h1>
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{userName}</p>
          </motion.div>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = pathname === link.href
          return (
            <Link key={link.href} href={link.href}>
              <motion.div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[var(--accent)]/20 to-purple-500/20 text-[var(--accent)] border border-[var(--accent)]/20 shadow-lg shadow-[var(--accent-glow)]'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-bg)] hover:border hover:border-[var(--card-border)]'
                }`}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
              >
                <link.icon size={18} className="flex-shrink-0" />
                {!collapsed && <span>{link.label}</span>}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-[var(--card-border)] space-y-3">
        <div className="flex items-center justify-between">
          <ThemeToggle />
          <motion.button
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-bg)] hover:border hover:border-[var(--card-border)] transition-all"
            onClick={() => setCollapsed(!collapsed)}
            whileTap={{ scale: 0.9 }}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </motion.button>
        </div>
        <motion.div
          className="flex items-center gap-3 px-3 py-2 rounded-2xl text-sm text-red-400 hover:bg-red-500/10 hover:border hover:border-red-500/20 cursor-pointer transition-all"
          whileHover={{ x: 3 }}
          onClick={handleLogout}
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </motion.div>
      </div>
    </motion.aside>
  )
}
