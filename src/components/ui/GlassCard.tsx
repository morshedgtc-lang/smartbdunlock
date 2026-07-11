'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useGlassEffect } from '@/hooks/useGlassEffect'

interface GlassCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
  premium?: boolean
  padding?: string
  waterRipple?: boolean
}

export function GlassCard({
  children,
  className = '',
  hover = true,
  glow = false,
  premium = false,
  padding = 'p-6',
  waterRipple = true
}: GlassCardProps) {
  const { containerRef, glowRef, handlers } = useGlassEffect({
    enableTilt: hover,
    enableDistortion: waterRipple,
    enableGlow: true,
    intensity: 1,
  })

  return (
    <motion.div
      ref={containerRef}
      className={`${premium ? 'glass-premium glass-tilt' : 'glass glass-hover glass-tilt'} ${glow ? 'glow-border' : ''} ${padding} ${className}`}
      whileHover={hover ? { scale: 1.01, y: -2 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      {...handlers}
    >
      {/* Water ripple glow overlay */}
      <div
        ref={glowRef}
        className="glass-mouse-glow pointer-events-none"
        aria-hidden="true"
      />
      {children}
    </motion.div>
  )
}