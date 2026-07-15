'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, LucideIcon } from 'lucide-react'

export interface DropdownOption {
  value: string
  label: string
  icon?: LucideIcon
  disabled?: boolean
}

interface GlassDropdownProps {
  options: DropdownOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
  className?: string
  icon?: LucideIcon
  size?: 'sm' | 'md' | 'lg'
}

export function GlassDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  label,
  error,
  disabled = false,
  className = '',
  icon: Icon,
  size = 'md',
}: GlassDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsOpen(false); return }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => {
          let next = prev + 1
          while (next < options.length && options[next].disabled) next++
          return next < options.length ? next : prev
        })
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => {
          let next = prev - 1
          while (next >= 0 && options[next].disabled) next--
          return next >= 0 ? next : prev
        })
      }
      if (e.key === 'Enter' && selectedIndex >= 0 && !options[selectedIndex].disabled) {
        e.preventDefault()
        onChange?.(options[selectedIndex].value)
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, options, selectedIndex, onChange])

  const handleSelect = (option: DropdownOption) => {
    if (option.disabled) return
    onChange?.(option.value)
    setIsOpen(false)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!wrapperRef.current || !glowRef.current) return
    const panel = wrapperRef.current.querySelector('.glass-dropdown-panel')
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    glowRef.current.style.left = `${e.clientX - rect.left}px`
    glowRef.current.style.top = `${e.clientY - rect.top}px`
    glowRef.current.style.opacity = '1'
  }

  const handleMouseLeave = () => {
    if (glowRef.current) glowRef.current.style.opacity = '0'
  }

  const sizeClasses = {
    sm: 'px-3 py-2 text-xs gap-2',
    md: 'px-4 py-2.5 text-sm gap-2.5',
    lg: 'px-5 py-3 text-base gap-3',
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-[var(--foreground)] pl-1">
          {label}
        </label>
      )}
      <div ref={wrapperRef} className={`glass-dropdown ${isOpen ? 'open' : ''} relative`}>
        <button
          type="button"
          className={`glass-dropdown-trigger w-full justify-between ${sizeClasses[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && <Icon size={16} className="text-[var(--muted)] flex-shrink-0" />}
            {selected?.icon && <selected.icon size={16} className="text-[var(--muted)] flex-shrink-0" />}
            <span className={selected ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'}>
              {selected?.label || placeholder}
            </span>
          </div>
          <ChevronDown size={14} className={`arrow text-[var(--muted)] flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="glass-dropdown-panel w-full"
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <div ref={glowRef} className="dropdown-mouse-glow" />
              <div className="dropdown-specular-left" />
              {options.map((option, idx) => (
                <div
                  key={option.value}
                  className={`glass-dropdown-item ${value === option.value ? 'active' : ''} ${option.disabled ? 'opacity-40 cursor-not-allowed' : ''} ${selectedIndex === idx ? 'bg-[var(--accent)]/8' : ''}`}
                  onClick={() => handleSelect(option)}
                >
                  {option.icon && <option.icon size={16} className="flex-shrink-0" />}
                  <span className="truncate">{option.label}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {error && (
        <p className="text-xs text-red-500 pl-1">{error}</p>
      )}
    </div>
  )
}
