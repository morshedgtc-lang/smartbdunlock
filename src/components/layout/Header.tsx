'use client'

import { GlassSearch } from '@/components/ui/GlassSearch'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { ProfileDropdown } from '@/components/ui/ProfileDropdown'

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
        <div className="ml-1">
          <ProfileDropdown />
        </div>
      </div>
    </header>
  )
}