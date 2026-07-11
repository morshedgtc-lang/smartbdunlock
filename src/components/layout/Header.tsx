'use client'

import { Bell, User } from 'lucide-react'
import { GlassSearch } from '@/components/ui/GlassSearch'

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
        <button className="relative w-10 h-10 rounded-2xl flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-bg)] hover:border hover:border-[var(--card-border)] transition-all cursor-pointer">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[var(--background)] animate-pulse" />
        </button>
        <div className="flex items-center gap-2 ml-1">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <User size={16} className="text-white" />
          </div>
        </div>
      </div>
    </header>
  )
}