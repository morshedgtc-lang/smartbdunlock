'use client'

import { useState, useRef, useEffect, ReactNode, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, LucideIcon, Check } from 'lucide-react'

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
  const panelRef = useRef<HTMLDivElement>(null)
  const mouseGlowRef = useRef<HTMLDivElement>(null)

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

  const handleMouseGlow = useCallback((e: React.MouseEvent) => {
    if (!panelRef.current || !mouseGlowRef.current) return
    const rect = panelRef.current.getBoundingClientRect()
    mouseGlowRef.current.style.left = `${e.clientX - rect.left}px`
    mouseGlowRef.current.style.top = `${e.clientY - rect.top}px`
    mouseGlowRef.current.style.opacity = '1'
  }, [])

  const handleMouseGlowLeave = useCallback(() => {
    if (mouseGlowRef.current) {
      mouseGlowRef.current.style.opacity = '0'
    }
  }, [])

  const handleSelect = (option: DropdownOption) => {
    if (option.disabled) return
    onChange?.(option.value)
    setIsOpen(false)
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-5 py-3 text-base gap-2.5',
  }

  const panelSizeClasses = {
    sm: 'min-w-[180px]',
    md: 'min-w-[220px]',
    lg: 'min-w-[260px]',
  }

  const alignClass = align === 'right' ? 'right-0' : 'left-0'

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      {label && (
        <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider pl-1 mb-1.5">
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
          className={`glass-dropdown-trigger inline-flex items-center justify-between gap-2 rounded-xl text-sm font-medium cursor-pointer transition-all duration-300 ${sizeClasses[size]} ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          } ${
            isOpen ? 'glass-dropdown-trigger-active' : ''
          } ${triggerClassName}`}
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
            className={`text-[var(--muted)] flex-shrink-0 transition-transform duration-300 ease-[var(--ease-spring)] ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      )}

      {/* Menu */}
      {!children && (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={panelRef}
              className={`absolute top-full mt-2 z-[9999] border rounded-2xl shadow-2xl py-1.5 overflow-hidden ${alignClass} ${panelSizeClasses[size]} ${menuClassName}`}
              style={{
                background: 'var(--card-bg)',
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                borderColor: 'var(--card-border)',
                boxShadow: '0 8px 32px var(--shadow-color), 0 32px 80px var(--shadow-color), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              onMouseMove={handleMouseGlow}
              onMouseLeave={handleMouseGlowLeave}
            >
              {/* Mouse glow effect */}
              <div
                ref={mouseGlowRef}
                className="dropdown-mouse-glow"
                aria-hidden="true"
              />
              {/* Specular edge highlight */}
              <div className="dropdown-specular-left" aria-hidden="true" />

              {options.map((option, idx) => {
                const isSelected = value === option.value
                const isHighlighted = selectedIndex === idx
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`relative z-[2] w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-all duration-200 cursor-pointer mx-1.5 rounded-lg ${
                      isSelected
                        ? 'text-[var(--accent)] font-medium'
                        : 'text-[var(--foreground)]'
                    } ${option.disabled ? 'opacity-40 cursor-not-allowed' : ''} ${
                      isHighlighted ? 'glass-dropdown-item-hover' : ''
                    }`}
                    style={{
                      width: 'calc(100% - 12px)',
                    }}
                    onClick={() => handleSelect(option)}
                    disabled={option.disabled}
                  >
                    {option.icon && <option.icon size={15} className="flex-shrink-0 text-[var(--muted)]" />}
                    <span className="truncate flex-1">{option.label}</span>
                    {isSelected && (
                      <Check size={14} className="flex-shrink-0 text-[var(--accent)]" />
                    )}
                  </button>
                )
              })}

              {options.length === 0 && (
                <div className="px-4 py-3 text-sm text-[var(--muted)] text-center relative z-[2]">
                  No options
                </div>
              )}
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
