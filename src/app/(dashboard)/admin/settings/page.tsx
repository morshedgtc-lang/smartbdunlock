'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassInput } from '@/components/ui/GlassInput'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassDropdown, DropdownOption } from '@/components/ui/GlassDropdown'
import { motion } from 'framer-motion'
import { Save, Globe, Shield, AlertTriangle, Building2, Loader2, Check } from 'lucide-react'
import { useAuth } from '@/lib/api'
import { useRouter } from 'next/navigation'

interface SettingsData {
  platformName: string
  supportEmail: string
  currency: string
  platformDescription: string
  maintenanceMode: string
}

const CURRENCY_OPTIONS: DropdownOption[] = [
  { value: 'USD', label: 'USD – US Dollar' },
  { value: 'EUR', label: 'EUR – Euro' },
  { value: 'GBP', label: 'GBP – British Pound' },
  { value: 'BDT', label: 'BDT – Bangladeshi Taka' },
]

const DEFAULT_SETTINGS: SettingsData = {
  platformName: 'SmartBD Unlock',
  supportEmail: 'support@smartbdunlock.com',
  currency: 'USD',
  platformDescription: '',
  maintenanceMode: 'false',
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && user?.role !== 'admin') {
      router.replace('/reseller/dashboard')
    }
  }, [authLoading, user, router])

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/settings', { credentials: 'same-origin' })
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setSettings({
        platformName: data.platformName ?? DEFAULT_SETTINGS.platformName,
        supportEmail: data.supportEmail ?? DEFAULT_SETTINGS.supportEmail,
        currency: data.currency ?? DEFAULT_SETTINGS.currency,
        platformDescription: data.platformDescription ?? DEFAULT_SETTINGS.platformDescription,
        maintenanceMode: data.maintenanceMode ?? DEFAULT_SETTINGS.maintenanceMode,
      })
    } catch {
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchSettings()
    }
  }, [user, fetchSettings])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || 'Failed to save')
      }
      const data = await res.json()
      setSettings({
        platformName: data.platformName ?? settings.platformName,
        supportEmail: data.supportEmail ?? settings.supportEmail,
        currency: data.currency ?? settings.currency,
        platformDescription: data.platformDescription ?? settings.platformDescription,
        maintenanceMode: data.maintenanceMode ?? settings.maintenanceMode,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || user?.role !== 'admin') return null

  return (
    <div>
      <Header title="Settings" subtitle="System configuration" />
      <div className="p-6 space-y-6 max-w-3xl">

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
          >
            <AlertTriangle size={16} className="text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <Globe size={20} className="text-[var(--accent)]" />
              <h3 className="font-bold text-[var(--foreground)]">General</h3>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
              </div>
            ) : (
              <div className="space-y-4">
                <GlassInput
                  label="Platform Name"
                  value={settings.platformName}
                  onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                />
                <GlassInput
                  label="Support Email"
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                />
                <GlassDropdown
                  label="Default Currency"
                  options={CURRENCY_OPTIONS}
                  value={settings.currency}
                  onChange={(value) => setSettings({ ...settings, currency: value })}
                />
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-[var(--foreground)] pl-1">
                    Platform Description
                  </label>
                  <textarea
                    className="w-full h-24 pl-4 pr-4 py-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] text-sm placeholder:text-[var(--muted)] outline-none transition-all duration-200 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)] focus:bg-[var(--surface)] resize-none"
                    value={settings.platformDescription}
                    onChange={(e) => setSettings({ ...settings, platformDescription: e.target.value })}
                    placeholder="Brief description of your platform..."
                  />
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <Building2 size={20} className="text-[var(--accent)]" />
              <h3 className="font-bold text-[var(--foreground)]">System</h3>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)]">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-[var(--foreground)]">Maintenance Mode</p>
                    <p className="text-xs text-[var(--muted)]">
                      {settings.maintenanceMode === 'true'
                        ? 'Site is currently in maintenance mode'
                        : 'Site is live and accessible'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        maintenanceMode: settings.maintenanceMode === 'true' ? 'false' : 'true',
                      })
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--accent-glow)] ${
                      settings.maintenanceMode === 'true'
                        ? 'bg-[var(--accent)]'
                        : 'bg-[var(--input-border)]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full shadow-lg ring-0 transition-transform duration-200 ease-in-out mt-0.5 ${
                        settings.maintenanceMode === 'true'
                          ? 'translate-x-[22px] bg-white'
                          : 'translate-x-0.5 bg-[var(--muted)]'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <Shield size={20} className="text-[var(--accent)]" />
              <h3 className="font-bold text-[var(--foreground)]">Security</h3>
            </div>
            <div className="space-y-4">
              <GlassInput label="JWT Secret" type="password" value="••••••••••••••••" readOnly />
              <GlassInput label="Session Timeout (minutes)" type="number" value="10080" readOnly />
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                <p className="text-xs text-amber-300">
                  JWT secret and session timeout are managed via environment variables on the server.
                  Contact your system administrator to change these values.
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <div className="flex justify-end gap-3 pb-8">
          <motion.div
            initial={false}
            animate={saved ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <span className="text-sm text-green-400 flex items-center gap-1.5">
              <Check size={16} />
              Saved
            </span>
          </motion.div>
          <GlassButton onClick={handleSave} disabled={saving || loading} loading={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
          </GlassButton>
        </div>
      </div>
    </div>
  )
}
