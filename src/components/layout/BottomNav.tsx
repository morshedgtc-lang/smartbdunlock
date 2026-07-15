'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { LayoutDashboard, Package, ShoppingCart, Wallet } from 'lucide-react'

const links = [
  { href: '/reseller/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/reseller/services', label: 'Services', icon: Package },
  { href: '/reseller/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/reseller/wallet', label: 'Wallet', icon: Wallet },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      <div className="glass-premium border-t border-[var(--card-border)] px-2 py-1 safe-area-inset-bottom">
        <div className="flex items-center justify-around">
          {links.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link key={link.href} href={link.href}>
                <motion.div
                  className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all ${
                    isActive
                      ? 'text-[var(--accent)]'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                  whileTap={{ scale: 0.9 }}
                >
                  <div className="relative">
                    <link.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    {isActive && (
                      <motion.div
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--accent)]"
                        layoutId="bottomNavIndicator"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </div>
                  <span className="text-[10px] font-medium">{link.label}</span>
                </motion.div>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
