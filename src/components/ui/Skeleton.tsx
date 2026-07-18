'use client'

import { motion } from 'framer-motion'

function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-white/5 ${className}`}>
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/8 to-transparent"
        animate={{ translateX: ['100%', '-100%'] }}
        transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
      />
    </div>
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`glass-premium p-5 space-y-3 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Shimmer className="h-3 w-24" />
          <Shimmer className="h-7 w-32" />
          <Shimmer className="h-3 w-20" />
        </div>
        <Shimmer className="w-12 h-12 rounded-2xl" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 px-4">
        {Array.from({ length: cols }).map((_, ci) => (
          <Shimmer key={ci} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} className="flex gap-4 px-4 py-3">
          {Array.from({ length: cols }).map((_, ci) => (
            <Shimmer key={ci} className={`h-4 flex-1 ${ci === 0 ? 'w-20' : ''}`} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonStat() {
  return (
    <div className="glass-premium p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Shimmer className="h-3 w-20" />
          <Shimmer className="h-8 w-24" />
        </div>
        <Shimmer className="w-10 h-10 rounded-xl" />
      </div>
    </div>
  )
}

export function SkeletonWelcome() {
  return (
    <div className="glass-premium p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-3 flex-1">
          <Shimmer className="h-4 w-32" />
          <Shimmer className="h-8 w-48" />
          <div className="flex gap-4">
            <Shimmer className="h-3 w-24" />
            <Shimmer className="h-3 w-24" />
            <Shimmer className="h-3 w-24" />
          </div>
        </div>
        <div className="flex gap-3">
          <Shimmer className="h-8 w-24 rounded-xl" />
          <Shimmer className="h-8 w-24 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonSection({ title = true }: { title?: boolean }) {
  return (
    <div className="glass-premium p-5 space-y-4">
      {title && <Shimmer className="h-5 w-36" />}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Shimmer key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
