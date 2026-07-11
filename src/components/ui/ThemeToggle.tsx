'use client'

import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon, Flower2 } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-xl bg-white/5 border border-[var(--card-border)] flex items-center justify-center">
        <Moon size={16} className="text-[var(--muted)]" />
      </div>
    )
  }

  const icon = theme === 'dark' ? <Moon size={16} /> : theme === 'light' ? <Sun size={16} /> : <Flower2 size={16} />
  const label = theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'Pink'
  const gradient = theme === 'dark'
    ? 'from-indigo-500/20 to-purple-500/20 border-indigo-500/30'
    : theme === 'light'
    ? 'from-amber-500/20 to-orange-500/20 border-amber-500/30'
    : 'from-pink-500/20 to-rose-500/20 border-pink-500/30'

  const cycle = () => {
    if (theme === 'dark') setTheme('light')
    else if (theme === 'light') setTheme('pink')
    else setTheme('dark')
  }

  return (
    <motion.button
      className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r ${gradient} border text-[var(--foreground)] text-xs font-medium cursor-pointer transition-all`}
      onClick={cycle}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={`Current: ${label} — Click to cycle`}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={theme}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center"
        >
          {icon}
        </motion.span>
      </AnimatePresence>
      <span className="hidden sm:inline">{label}</span>
    </motion.button>
  )
}
