'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassInput } from '@/components/ui/GlassInput'
import { GlassButton } from '@/components/ui/GlassButton'
import { motion } from 'framer-motion'
import { Save, Globe, Shield, Bell, Palette } from 'lucide-react'

export default function SettingsPage() {
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
              <GlassInput label="Platform Name" defaultValue="unlockOS" />
              <GlassInput label="Support Email" defaultValue="support@unlockos.com" />
              <GlassInput label="Default Currency" defaultValue="USD" />
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
              <GlassInput label="JWT Secret" type="password" defaultValue="••••••••••••••••" />
              <GlassInput label="Session Timeout (minutes)" type="number" defaultValue="30" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--foreground)]">Two-Factor Authentication</span>
                <div className="w-12 h-6 rounded-full bg-indigo-500 relative cursor-pointer">
                  <div className="w-5 h-5 rounded-full bg-white absolute right-0.5 top-0.5 shadow" />
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <Bell size={20} className="text-[var(--accent)]" />
              <h3 className="font-bold text-[var(--foreground)]">Notifications</h3>
            </div>
            <div className="space-y-3">
              {['Email on order completion', 'Email on failed orders', 'Low balance alert'].map(item => (
                <div key={item} className="flex items-center justify-between py-2">
                  <span className="text-sm text-[var(--foreground)]">{item}</span>
                  <div className="w-12 h-6 rounded-full bg-indigo-500 relative cursor-pointer">
                    <div className="w-5 h-5 rounded-full bg-white absolute right-0.5 top-0.5 shadow" />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        <div className="flex justify-end">
          <GlassButton><Save size={16} /> Save Settings</GlassButton>
        </div>
      </div>
    </div>
  )
}
