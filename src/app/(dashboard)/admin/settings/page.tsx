'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassInput } from '@/components/ui/GlassInput'
import { GlassButton } from '@/components/ui/GlassButton'
import { motion } from 'framer-motion'
import { Save, Globe, Shield, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface SettingsData {
  platformName: string
  supportEmail: string
  currency: string
}

export default function SettingsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [settings, setSettings] = useState<SettingsData>({
    platformName: 'SmartBD Unlock',
    supportEmail: 'support@smartbdunlock.com',
    currency: 'USD',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!loading && user?.role !== 'admin') {
      router.replace('/reseller/dashboard')
    }
  }, [loading, user, router])

  const handleSave = async () => {
    setSaving(true)
    try {
      localStorage.setItem('smartbd_settings', JSON.stringify(settings))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (loading || user?.role !== 'admin') return null

  return (
    <div>
      <Header title="Settings" subtitle="System configuration" />
      <div className="p-6 space-y-6 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <Globe size={20} className="text-[var(--accent)]" />
              <h3 className="font-bold text-[var(--foreground)]">General</h3>
            </div>
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
              <GlassInput
                label="Default Currency"
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              />
            </div>
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

        <div className="flex justify-end gap-3">
          {saved && (
            <span className="text-sm text-green-400 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </span>
          )}
          <GlassButton onClick={handleSave} disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
          </GlassButton>
        </div>
      </div>
    </div>
  )
}
