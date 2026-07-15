'use client'

import { User } from 'lucide-react'
import { GlassSearch } from '@/components/ui/GlassSearch'
import { NotificationBell } from '@/components/ui/NotificationBell'

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="header sticky top-0 z-20 px-6 py-4 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold text-[var(--foreground)]">{title}</h2>
        {subtitle && <p className="text-sm text-[var(--muted)]">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden md:block">
          <GlassSearch placeholder="⌘K Search..." />
        </div>
        <NotificationBell />
        <div className="flex items-center gap-2 ml-1">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <User size={16} className="text-white" />
          </div>
        </div>
      </div>
    </header>
  )
}