'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { useGlassEffect } from '@/hooks/useGlassEffect'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  change?: string
  changeType?: 'up' | 'down' | 'neutral'
  color?: string
}

const colorMap: Record<string, { bg: string; shadow: string; glow: string }> = {
  blue: { bg: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/30', glow: 'bg-blue-500/10' },
  purple: { bg: 'from-purple-500 to-fuchsia-500', shadow: 'shadow-purple-500/30', glow: 'bg-purple-500/10' },
  green: { bg: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/30', glow: 'bg-emerald-500/10' },
  amber: { bg: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/30', glow: 'bg-amber-500/10' },
  red: { bg: 'from-red-500 to-rose-500', shadow: 'shadow-red-500/30', glow: 'bg-red-500/10' },
  indigo: { bg: 'from-indigo-500 to-blue-500', shadow: 'shadow-indigo-500/30', glow: 'bg-indigo-500/10' },
  pink: { bg: 'from-pink-500 to-rose-500', shadow: 'shadow-pink-500/30', glow: 'bg-pink-500/10' },
}

export function StatCard({ title, value, icon: Icon, change, changeType = 'neutral', color = 'blue' }: StatCardProps) {
  const c = colorMap[color] || colorMap.blue
  const { containerRef, glowRef, handlers } = useGlassEffect({
    enableTilt: true,
    enableDistortion: true,
    enableGlow: true,
    intensity: 1.2,
  })

  return (
    <motion.div
      ref={containerRef}
      className="glass-premium glass-tilt p-5 relative overflow-hidden group cursor-pointer"
      whileHover={{ scale: 1.02, y: -3 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      {...handlers}
    >
      {/* Mouse-following glow */}
      <div
        ref={glowRef}
        className="glass-mouse-glow pointer-events-none"
        aria-hidden="true"
      />

      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-[var(--muted)] font-medium">{title}</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">{value}</p>
          {change && (
            <p className={`text-xs font-medium flex items-center gap-1 ${changeType === 'up' ? 'text-emerald-500' : changeType === 'down' ? 'text-red-500' : 'text-[var(--muted)]'}`}>
              {changeType === 'up' && <span className="inline-block w-0 h-0 border-l-4 border-r-4 border-b-6 border-transparent border-b-emerald-500" />}
              {changeType === 'down' && <span className="inline-block w-0 h-0 border-l-4 border-r-4 border-t-6 border-transparent border-t-red-500" />}
              {change}
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${c.bg} ${c.shadow} shadow-lg flex items-center justify-center`}>
          <Icon size={22} className="text-white" />
        </div>
      </div>

      {/* Hover glow */}
      <div className={`absolute -bottom-8 -right-8 w-32 h-32 rounded-full ${c.glow} blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
    </motion.div>
  )
}