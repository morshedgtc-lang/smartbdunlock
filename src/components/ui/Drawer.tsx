'use client'

import { ReactNode, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  subtitle?: string
  side?: 'left' | 'right' | 'bottom'
  size?: 'sm' | 'md' | 'lg'
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  footer?: ReactNode
}

const sideTransform = {
  left: { initial: { x: '-100%' }, animate: { x: 0 }, exit: { x: '-100%' } },
  right: { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } },
  bottom: { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } },
}

const sizeClasses = {
  sm: 'w-80',
  md: 'w-[420px]',
  lg: 'w-[560px]',
}

export function Drawer({
  open,
  onClose,
  children,
  title,
  subtitle,
  side = 'right',
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  footer,
}: DrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !closeOnEscape) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, closeOnEscape, onClose])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const isBottom = side === 'bottom'
  const positionClass = isBottom
    ? 'items-end justify-center'
    : side === 'left' ? 'items-stretch justify-start' : 'items-stretch justify-end'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          className={`fixed inset-0 z-50 flex ${positionClass}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (closeOnBackdrop && e.target === overlayRef.current) onClose()
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Panel */}
          <motion.div
            className={`relative glass-premium shadow-2xl flex flex-col ${
              isBottom ? `w-full max-h-[80vh] ${sizeClasses[size]}` : `${sizeClasses[size]} h-full`
            }`}
            initial={sideTransform[side].initial}
            animate={sideTransform[side].animate}
            exit={sideTransform[side].exit}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {(title || subtitle) && (
              <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[var(--card-border)]">
                <div>
                  {title && <h3 className="text-lg font-bold text-[var(--foreground)]">{title}</h3>}
                  {subtitle && <p className="text-sm text-[var(--muted)] mt-0.5">{subtitle}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-6 py-4 border-t border-[var(--card-border)]">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
