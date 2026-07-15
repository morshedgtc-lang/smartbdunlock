'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration: number
}

interface ToastContextType {
  toast: (type: ToastType, message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message, duration }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const icons = {
    success: <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />,
    error: <XCircle size={18} className="text-red-500 flex-shrink-0" />,
    warning: <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />,
    info: <Info size={18} className="text-blue-500 flex-shrink-0" />,
  }

  const borders = {
    success: 'border-l-emerald-500',
    error: 'border-l-red-500',
    warning: 'border-l-amber-500',
    info: 'border-l-blue-500',
  }

  const progressColors = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
  }

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] space-y-2 pointer-events-none max-sm:left-4 max-sm:right-4 max-sm:bottom-20">
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <motion.div
              key={t.id}
              layout
              className={`pointer-events-auto glass-premium border-l-4 ${borders[t.type]} px-4 py-3 flex items-center gap-3 min-w-[280px] max-w-[400px] shadow-xl`}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {icons[t.type]}
              <span className="text-sm text-[var(--foreground)] flex-1">{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer flex-shrink-0"
              >
                <X size={14} />
              </button>
              {/* Progress bar */}
              <motion.div
                className={`absolute bottom-0 left-0 h-0.5 ${progressColors[t.type]} rounded-full`}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: t.duration / 1000, ease: 'linear' }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
