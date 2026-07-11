'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface GlassButtonProps {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  onClick?: () => void
}

export function GlassButton({ variant = 'primary', size = 'md', loading = false, className = '', disabled, type = 'button', onClick, children }: GlassButtonProps) {
  const base = 'relative font-medium rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'

  const variants = {
    primary: 'glass-btn',
    secondary: 'glass-btn glass-btn-secondary',
    ghost: 'bg-transparent hover:bg-white/10 dark:hover:bg-white/5 text-[var(--foreground)] rounded-xl px-4 py-2',
    danger: 'bg-red-500 hover:bg-red-600 text-white rounded-xl px-4 py-2 shadow-lg shadow-red-500/25',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
  }

  return (
    <motion.button
      type={type}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      whileHover={!disabled ? { scale: 1.03, y: -1 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </motion.button>
  )
}
