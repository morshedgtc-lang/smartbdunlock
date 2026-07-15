'use client'

import { ReactNode } from 'react'
import { Modal } from './Modal'
import { GlassButton } from './GlassButton'
import { AlertTriangle, Trash2, Info, CheckCircle, XCircle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  variant?: 'danger' | 'warning' | 'info' | 'success'
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  icon?: ReactNode
}

const variantConfig = {
  danger: {
    icon: <Trash2 size={24} className="text-red-500" />,
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    confirmVariant: 'danger' as const,
    defaultLabel: 'Delete',
  },
  warning: {
    icon: <AlertTriangle size={24} className="text-amber-500" />,
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    confirmVariant: 'primary' as const,
    defaultLabel: 'Confirm',
  },
  info: {
    icon: <Info size={24} className="text-blue-500" />,
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    confirmVariant: 'primary' as const,
    defaultLabel: 'OK',
  },
  success: {
    icon: <CheckCircle size={24} className="text-emerald-500" />,
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    confirmVariant: 'primary' as const,
    defaultLabel: 'OK',
  },
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  variant = 'danger',
  confirmLabel,
  cancelLabel = 'Cancel',
  loading = false,
  icon,
}: ConfirmDialogProps) {
  const config = variantConfig[variant]

  return (
    <Modal open={open} onClose={onClose} size="sm" showClose={false}>
      <div className="text-center">
        <div className={`w-16 h-16 rounded-2xl ${config.bg} border ${config.border} flex items-center justify-center mx-auto mb-4`}>
          {icon || config.icon}
        </div>
        <h3 className="text-lg font-bold text-[var(--foreground)] mb-2">{title}</h3>
        <p className="text-sm text-[var(--muted)] mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <GlassButton
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </GlassButton>
          <GlassButton
            variant={config.confirmVariant}
            className="flex-1"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel || config.defaultLabel}
          </GlassButton>
        </div>
      </div>
    </Modal>
  )
}

interface AlertModalProps {
  open: boolean
  onClose: () => void
  title: string
  message: string
  variant?: 'success' | 'error' | 'warning' | 'info'
  buttonLabel?: string
}

const alertVariantConfig = {
  success: {
    icon: <CheckCircle size={24} className="text-emerald-500" />,
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  error: {
    icon: <XCircle size={24} className="text-red-500" />,
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
  warning: {
    icon: <AlertTriangle size={24} className="text-amber-500" />,
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  info: {
    icon: <Info size={24} className="text-blue-500" />,
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
}

export function AlertModal({
  open,
  onClose,
  title,
  message,
  variant = 'info',
  buttonLabel = 'OK',
}: AlertModalProps) {
  const config = alertVariantConfig[variant]

  return (
    <Modal open={open} onClose={onClose} size="sm" showClose={false}>
      <div className="text-center">
        <div className={`w-16 h-16 rounded-2xl ${config.bg} border ${config.border} flex items-center justify-center mx-auto mb-4`}>
          {config.icon}
        </div>
        <h3 className="text-lg font-bold text-[var(--foreground)] mb-2">{title}</h3>
        <p className="text-sm text-[var(--muted)] mb-6 leading-relaxed">{message}</p>
        <GlassButton className="w-full" onClick={onClose}>
          {buttonLabel}
        </GlassButton>
      </div>
    </Modal>
  )
}
