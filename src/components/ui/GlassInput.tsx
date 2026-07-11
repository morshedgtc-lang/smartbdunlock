'use client'

import { InputHTMLAttributes, forwardRef } from 'react'
import { LucideIcon } from 'lucide-react'

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: LucideIcon
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ label, error, icon: Icon, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-[var(--foreground)] pl-1">
            {label}
          </label>
        )}
        <div className="relative group">
          {Icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] group-focus-within:text-[var(--accent)] transition-colors duration-200">
              <Icon size={18} strokeWidth={2} />
            </div>
          )}
          <input
            ref={ref}
            className={`w-full h-11 ${Icon ? 'pl-11' : 'pl-4'} pr-4 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] text-sm placeholder:text-[var(--muted)] outline-none transition-all duration-200 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)] focus:bg-[var(--surface)] ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''} ${className}`}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-red-500 pl-1">{error}</p>
        )}
      </div>
    )
  }
)

GlassInput.displayName = 'GlassInput'
