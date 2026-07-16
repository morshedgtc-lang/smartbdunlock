'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, CheckCheck } from 'lucide-react'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  link?: string
  createdAt: string
}

function timeAgo(dateString: string): string {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const seconds = Math.floor((now - then) / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

const typeStyles: Record<string, string> = {
  info: 'bg-blue-500/20 text-blue-500',
  success: 'bg-emerald-500/20 text-emerald-500',
  warning: 'bg-amber-500/20 text-amber-500',
  error: 'bg-red-500/20 text-red-500',
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [connected, setConnected] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/notifications?limit=30', { credentials: 'same-origin' })
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()

    let retryDelay = 3000
    let retryTimeout: ReturnType<typeof setTimeout> | null = null
    let eventSource: EventSource | null = null

    const connect = () => {
      eventSource = new EventSource('/api/notifications/stream')

      eventSource.onopen = () => {
        setConnected(true)
        retryDelay = 3000
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.notifications) {
            setNotifications(prev => {
              const existingIds = new Set(prev.map(n => n.id))
              const newOnes = data.notifications.filter((n: Notification) => !existingIds.has(n.id))
              if (newOnes.length === 0) return prev
              return [...newOnes, ...prev].slice(0, 30)
            })
          }
          if (typeof data.unreadCount === 'number') {
            setUnreadCount(data.unreadCount)
          }
        } catch {
          // silent
        }
      }

      eventSource.onerror = () => {
        setConnected(false)
        eventSource?.close()
        retryTimeout = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 1.5, 30000)
          connect()
        }, retryDelay)
      }
    }

    connect()

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout)
      if (eventSource) {
        eventSource.onopen = null
        eventSource.onmessage = null
        eventSource.onerror = null
        eventSource.close()
      }
    }
  }, [fetchNotifications])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {
      // silent
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {
      // silent
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/10 dark:hover:bg-white/5 transition-colors"
      >
        <Bell size={20} />
        {!connected && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full shadow-lg shadow-red-500/30" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full shadow-lg shadow-red-500/30">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="glass-dropdown-panel w-[380px] right-0 !p-0 overflow-hidden"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--card-border)]">
              <span className="text-sm font-semibold text-[var(--foreground)]">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 text-xs text-[var(--muted)]">({unreadCount} unread)</span>
                )}
              </span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                >
                  <CheckCheck size={14} />
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="max-h-96 overflow-y-auto overscroll-contain">
              {loading && notifications.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-sm text-[var(--muted)]">
                  Loading...
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-sm text-[var(--muted)]">
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => {
                      if (!notification.read) markAsRead(notification.id)
                      if (notification.link) {
                        window.location.href = notification.link
                      }
                      setIsOpen(false)
                    }}
                    className={`w-full text-left px-4 py-3 border-b border-[var(--card-border)] last:border-b-0 transition-colors hover:bg-white/5 dark:hover:bg-white/[0.03] ${
                      !notification.read ? 'bg-[var(--accent)]/[0.04]' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 flex-shrink-0 w-2 h-2 rounded-full ${
                        !notification.read ? 'bg-[var(--accent)]' : 'bg-transparent'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm font-medium truncate ${
                            !notification.read ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'
                          }`}>
                            {notification.title}
                          </span>
                          <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${typeStyles[notification.type] || typeStyles.info}`}>
                            {notification.type}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <span className="text-[10px] text-[var(--muted)]/60 mt-1 block">
                          {timeAgo(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
