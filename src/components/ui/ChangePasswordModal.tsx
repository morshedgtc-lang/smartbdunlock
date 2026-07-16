'use client'

import { useState } from 'react'
import { Lock, Eye, EyeOff, Check, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'

interface ChangePasswordModalProps {
  open: boolean
  onClose: () => void
}

interface ValidationRule {
  label: string
  met: boolean
}

function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 2) return { label: 'Weak', color: 'bg-red-500', width: 'w-1/3' }
  if (score <= 3) return { label: 'Medium', color: 'bg-amber-500', width: 'w-2/3' }
  return { label: 'Strong', color: 'bg-emerald-500', width: 'w-full' }
}

export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const { toast } = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const rules: ValidationRule[] = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(newPassword) },
    { label: 'Contains number', met: /[0-9]/.test(newPassword) },
    { label: 'Passwords match', met: newPassword.length > 0 && newPassword === confirmPassword },
  ]

  const strength = newPassword ? getPasswordStrength(newPassword) : null
  const allRulesMet = rules.every(r => r.met)

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!currentPassword) errs.currentPassword = 'Current password is required'
    if (!newPassword) errs.newPassword = 'New password is required'
    else if (newPassword.length < 8) errs.newPassword = 'Password must be at least 8 characters'
    else if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      errs.newPassword = 'Password must contain uppercase, lowercase, and number'
    }
    if (newPassword !== confirmPassword) errs.confirmPassword = 'Passwords do not match'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast('error', data.error || 'Failed to change password')
        return
      }
      toast('success', 'Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setErrors({})
      onClose()
    } catch {
      toast('error', 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setErrors({})
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Change Password" size="sm">
      <div className="space-y-4">
        {/* Current Password */}
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Current Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setErrors(p => ({ ...p, currentPassword: '' })) }}
              className="glass-input w-full pl-10 pr-10"
              placeholder="Enter current password"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
            >
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.currentPassword && <p className="text-xs text-red-400 mt-1">{errors.currentPassword}</p>}
        </div>

        {/* New Password */}
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">New Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setErrors(p => ({ ...p, newPassword: '' })) }}
              className="glass-input w-full pl-10 pr-10"
              placeholder="Enter new password"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.newPassword && <p className="text-xs text-red-400 mt-1">{errors.newPassword}</p>}

          {/* Strength indicator */}
          {strength && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--muted)]">Password strength</span>
                <span className={`text-xs font-medium ${strength.label === 'Weak' ? 'text-red-400' : strength.label === 'Medium' ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {strength.label}
                </span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Confirm New Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setErrors(p => ({ ...p, confirmPassword: '' })) }}
              className="glass-input w-full pl-10 pr-10"
              placeholder="Confirm new password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-xs text-red-400 mt-1">{errors.confirmPassword}</p>}
        </div>

        {/* Validation Rules */}
        {newPassword && (
          <div className="space-y-1.5">
            {rules.map((rule) => (
              <div key={rule.label} className="flex items-center gap-2 text-xs">
                {rule.met ? (
                  <Check size={14} className="text-emerald-400 flex-shrink-0" />
                ) : (
                  <X size={14} className="text-[var(--muted)] flex-shrink-0" />
                )}
                <span className={rule.met ? 'text-emerald-400' : 'text-[var(--muted)]'}>{rule.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !allRulesMet || !currentPassword}
          className="glass-btn w-full justify-center mt-2"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Changing...
            </span>
          ) : (
            'Change Password'
          )}
        </button>
      </div>
    </Modal>
  )
}
