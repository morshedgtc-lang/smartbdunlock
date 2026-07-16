'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, LucideIcon } from 'lucide-react'

export interface DropdownOption {
  value: string
  label: string
  icon?: LucideIcon
  disabled?: boolean
}

export interface DropdownProps {
  options?: DropdownOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
  className?: string
  icon?: LucideIcon
  size?: 'sm' | 'md' | 'lg'
  align?: 'left' | 'right'
  children?: ReactNode
  open?: boolean
  onToggle?: (open: boolean) => void
  triggerClassName?: string
  menuClassName?: string
}

export function Dropdown({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  label,
  error,
  disabled = false,
  className = '',
  icon: Icon,
  size = 'md',
  align = 'left',
  children,
  open: controlledOpen,
  onToggle,
  triggerClassName = '',
  menuClassName = '',
}: DropdownProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setIsOpen = onToggle || setInternalOpen

  const [selectedIndex, setSelectedIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [setIsOpen])

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
  }, [isOpen, options, selectedIndex, onChange, setIsOpen])

  useEffect(() => {
    if (!isOpen) setSelectedIndex(-1)
  }, [isOpen])

  const handleSelect = (option: DropdownOption) => {
    if (option.disabled) return
    onChange?.(option.value)
    setIsOpen(false)
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  }

  const alignClass = align === 'right' ? 'right-0' : 'left-0'

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      {label && (
        <label className="block text-sm font-medium text-[var(--foreground)] pl-1 mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger */}
      {children ? (
        <div onClick={() => !disabled && setIsOpen(!isOpen)} className="cursor-pointer">
          {children}
        </div>
      ) : (
        <button
          type="button"
          className={`inline-flex items-center justify-between gap-2 rounded-xl border text-sm font-medium cursor-pointer transition-colors ${sizeClasses[size]} ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          } ${
            isOpen ? 'border-[var(--accent)]' : 'border-[var(--card-border)] hover:border-[var(--accent)]/30'
          } ${triggerClassName}`}
          style={{
            background: isOpen ? 'var(--card-bg)' : 'var(--input-bg)',
            color: 'var(--foreground)',
          }}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 min-w-0">
            {Icon && <Icon size={15} className="text-[var(--muted)] flex-shrink-0" />}
            {selected?.icon && <selected.icon size={15} className="text-[var(--muted)] flex-shrink-0" />}
            <span className={selected ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'}>
              {selected?.label || placeholder}
            </span>
          </div>
          <ChevronDown
            size={14}
            className={`text-[var(--muted)] flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      )}

      {/* Menu — only render when no custom children are provided */}
      {!children && (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className={`absolute top-full mt-2 z-50 min-w-[200px] border rounded-xl shadow-xl py-1 ${alignClass} ${menuClassName}`}
              style={{
                background: 'var(--card-bg)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                borderColor: 'var(--card-border)',
              }}
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {options.map((option, idx) => (
                <button
                  key={option.value}
                  type="button"
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors cursor-pointer ${
                    value === option.value
                      ? 'text-[var(--accent)]'
                      : 'text-[var(--foreground)]'
                  } ${option.disabled ? 'opacity-40 cursor-not-allowed' : ''} ${
                    selectedIndex === idx ? 'bg-[var(--accent)]/5' : ''
                  }`}
                  style={{
                    background: value === option.value || selectedIndex === idx
                      ? 'rgba(99, 102, 241, 0.08)'
                      : undefined,
                  }}
                  onMouseEnter={(e) => {
                    if (value !== option.value && selectedIndex !== idx) {
                      e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (value !== option.value && selectedIndex !== idx) {
                      e.currentTarget.style.background = ''
                    }
                  }}
                  onClick={() => handleSelect(option)}
                  disabled={option.disabled}
                >
                  {option.icon && <option.icon size={15} className="flex-shrink-0 text-[var(--muted)]" />}
                  <span className="truncate">{option.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {error && (
        <p className="text-xs text-red-500 pl-1 mt-1">{error}</p>
      )}
    </div>
  )
}
