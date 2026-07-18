'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Tabs, TabItem } from '@/components/ui/Tabs'
import { useApi } from '@/hooks/useApi'
import { useToast } from '@/components/ui/Toast'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import {
  Loader2,
  ArrowLeft,
  Clock,
  Calendar,
  Smartphone,
  CreditCard,
  MessageSquareText,
  Paperclip,
  Send,
  FileText,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  Tag,
  AlertCircle,
} from 'lucide-react'

interface CustomValue {
  id: string
  label?: string
  fieldType?: string
  value: string
}

interface Attachment {
  id: string
  fileName: string
  fileUrl: string
  fileType?: string | null
  fileSize?: number | null
  uploadedByName?: string | null
  createdAt: string
}

interface TimelineEvent {
  id: string
  authorName: string
  content: string
  visible: boolean
  createdAt: string
}

interface NoteMessage {
  id: string
  authorName: string
  content: string
  visible: boolean
  createdAt: string
}

interface OrderUser {
  id: string
  name: string
  email: string
  phone?: string | null
  userId?: string | null
  walletBalance?: number
}

interface OrderService {
  name?: string
  type?: string
  processingTime?: string | null
  category?: string | null
}

interface OrderDetail {
  id: string
  orderNumber: string
  status: string
  priority?: string
  imei?: string | null
  deviceInfo?: string | null
  cost?: number
  sellingPrice?: number
  profit?: number
  notes?: string | null
  internalNotes?: string | null
  result?: string | null
  completedAt?: string | null
  assignedTo?: string | null
  createdAt: string
  updatedAt: string
  user: OrderUser
  service: OrderService
  customValues: CustomValue[]
  attachments: Attachment[]
  timeline: TimelineEvent[]
  messages: NoteMessage[]
  payments: {
    id: string
    type: string
    amount: number
    balanceAfter?: number
    description?: string | null
    createdAt: string
  }[]
  logs: {
    id: string
    action: string
    description?: string | null
    module?: string | null
    createdAt: string
  }[]
}

function renderCustomValue(value: string, fieldType?: string): string {
  if (!value) return '—'
  if (fieldType === 'image' || fieldType === 'file') return '📎 Attached'
  if (fieldType === 'checkbox') return value === 'true' ? '✓ Yes' : '✗ No'
  if (['imei_multi', 'serial_multi', 'multiselect'].includes(fieldType || '')) {
    try {
      const arr = JSON.parse(value)
      return Array.isArray(arr) ? arr.join(', ') : value
    } catch {
      return value
    }
  }
  return value
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function computeProcessingTime(start: string, end?: string | null): string {
  if (!end) return 'In progress'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const minutes = Math.floor(ms / 60000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainMinutes = minutes % 60
  if (hours < 24) return `${hours}h ${remainMinutes}m`
  const days = Math.floor(hours / 24)
  const remainHours = hours % 24
  return `${days}d ${remainHours}h`
}

function isImageType(fileType?: string | null): boolean {
  if (!fileType) return false
  return fileType.startsWith('image/')
}

export default function ResellerOrderDetailPage() {
  const params = useParams()
  const orderId = params.id as string
  const { toast } = useToast()

  const {
    data: order,
    loading: orderLoading,
    error: orderError,
    refetch: refetchOrder,
  } = useApi<OrderDetail>({ url: `/api/orders/${orderId}` })

  const {
    data: timelineRes,
    loading: timelineLoading,
    refetch: refetchTimeline,
  } = useApi<{ timeline: TimelineEvent[] }>({ url: `/api/orders/${orderId}/timeline` })

  const {
    data: notesRes,
    loading: notesLoading,
    refetch: refetchNotes,
  } = useApi<{ notes: NoteMessage[] }>({ url: `/api/orders/${orderId}/notes` })

  const [activeTab, setActiveTab] = useState('overview')
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [expandedFields, setExpandedFields] = useState(true)

  const timeline = timelineRes?.timeline || order?.timeline || []
  const messages = notesRes?.notes || order?.messages || []
  const attachments = order?.attachments || []
  const customValues = order?.customValues || []

  const loading = orderLoading || timelineLoading || notesLoading

  const handleSendMessage = async () => {
    if (!messageText.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageText, visible: true }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to send message')
      setMessageText('')
      toast('success', 'Message sent')
      refetchNotes()
      refetchTimeline()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const tabs: TabItem[] = [
    { key: 'overview', label: 'Overview', icon: <FileText size={14} /> },
    { key: 'files', label: 'Files', icon: <Paperclip size={14} />, badge: attachments.length },
    { key: 'messages', label: 'Messages', icon: <MessageSquareText size={14} />, badge: messages.length },
    { key: 'timeline', label: 'Timeline', icon: <Clock size={14} />, badge: timeline.length },
  ]

  if (loading) {
    return (
      <div>
        <Header title="Order Details" subtitle="Loading..." />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
        </div>
      </div>
    )
  }

  if (orderError || !order) {
    return (
      <div>
        <Header title="Order Details" />
        <div className="p-6 flex flex-col items-center justify-center py-20 gap-4">
          <AlertCircle size={40} className="text-[var(--muted)]" />
          <p className="text-[var(--muted)] text-sm">{orderError || 'Order not found'}</p>
          <Link href="/reseller/orders">
            <GlassButton variant="secondary" size="sm">
              <ArrowLeft size={16} /> Back to Orders
            </GlassButton>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title={order.orderNumber} subtitle={order.service?.name || 'Order Details'} />

      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Back link + Status */}
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link
            href="/reseller/orders"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
          >
            <ArrowLeft size={16} /> Back to Orders
          </Link>
          <StatusBadge status={order.status} />
        </motion.div>

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ============ OVERVIEW TAB ============ */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Order Info */}
              <GlassCard>
                <h3 className="font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
                  <Clock size={16} className="text-[var(--accent)]" /> Order Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
                    <p className="text-xs text-[var(--muted)] mb-1">Order ID</p>
                    <p className="text-sm font-mono font-medium text-[var(--foreground)]">{order.orderNumber}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
                    <p className="text-xs text-[var(--muted)] mb-1">Status</p>
                    <StatusBadge status={order.status} />
                  </div>
                  {order.priority && (
                    <div className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
                      <p className="text-xs text-[var(--muted)] mb-1">Priority</p>
                      <p className="text-sm font-medium text-[var(--foreground)] capitalize">{order.priority}</p>
                    </div>
                  )}
                  <div className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
                    <p className="text-xs text-[var(--muted)] mb-1">Created</p>
                    <p className="text-sm text-[var(--foreground)]">{formatDate(order.createdAt)}</p>
                  </div>
                  {order.completedAt && (
                    <div className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
                      <p className="text-xs text-[var(--muted)] mb-1">Completed</p>
                      <p className="text-sm text-[var(--foreground)]">{formatDate(order.completedAt)}</p>
                    </div>
                  )}
                  <div className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
                    <p className="text-xs text-[var(--muted)] mb-1">Processing Time</p>
                    <p className="text-sm text-[var(--foreground)]">
                      {computeProcessingTime(order.createdAt, order.completedAt)}
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Service Info */}
              <GlassCard>
                <h3 className="font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
                  <Smartphone size={16} className="text-[var(--accent)]" /> Service Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
                    <p className="text-xs text-[var(--muted)] mb-1">Service Name</p>
                    <p className="text-sm font-medium text-[var(--foreground)]">{order.service?.name || 'N/A'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
                    <p className="text-xs text-[var(--muted)] mb-1">Type</p>
                    <p className="text-sm text-[var(--foreground)]">{order.service?.type || 'N/A'}</p>
                  </div>
                </div>
              </GlassCard>

              {/* Device Info */}
              <GlassCard>
                <h3 className="font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
                  <Smartphone size={16} className="text-[var(--accent)]" /> Device Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
                    <p className="text-xs text-[var(--muted)] mb-1">IMEI</p>
                    <p className="text-sm font-mono font-medium text-[var(--foreground)]">{order.imei || '—'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
                    <p className="text-xs text-[var(--muted)] mb-1">Device Info</p>
                    <p className="text-sm text-[var(--foreground)]">{order.deviceInfo || 'N/A'}</p>
                  </div>
                </div>
              </GlassCard>

              {/* Custom Field Values */}
              {customValues.length > 0 && (
                <GlassCard>
                  <button
                    type="button"
                    onClick={() => setExpandedFields(!expandedFields)}
                    className="w-full flex items-center justify-between mb-0 cursor-pointer"
                  >
                    <h3 className="font-bold text-[var(--foreground)] flex items-center gap-2">
                      <Tag size={16} className="text-[var(--accent)]" /> Custom Field Values
                    </h3>
                    {expandedFields ? <ChevronUp size={16} className="text-[var(--muted)]" /> : <ChevronDown size={16} className="text-[var(--muted)]" />}
                  </button>
                  <AnimatePresence>
                    {expandedFields && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 space-y-2">
                          {customValues.map((cv) => (
                            <div
                              key={cv.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 px-3 rounded-lg bg-white/3 border border-[var(--card-border)] gap-1"
                            >
                              <span className="text-sm text-[var(--muted)] font-medium">{cv.label || 'Field'}</span>
                              <span className="text-sm text-[var(--foreground)] font-mono max-w-full sm:max-w-[60%] truncate">
                                {renderCustomValue(cv.value, cv.fieldType)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </GlassCard>
              )}

              {/* Pricing */}
              <GlassCard>
                <h3 className="font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
                  <CreditCard size={16} className="text-[var(--accent)]" /> Pricing
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
                    <p className="text-xs text-[var(--muted)] mb-1">Selling Price</p>
                    <p className="text-lg font-bold text-[var(--foreground)]">
                      ${order.sellingPrice?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
                    <p className="text-xs text-[var(--muted)] mb-1">Payment Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-sm text-emerald-400 font-medium">Deducted from wallet</span>
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* Admin Notes */}
              {order.notes && (
                <GlassCard className="border-indigo-500/10">
                  <h3 className="font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
                    <MessageSquareText size={16} className="text-indigo-400" /> Admin Notes
                  </h3>
                  <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/15">
                    <p className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                      {order.notes}
                    </p>
                  </div>
                </GlassCard>
              )}

              {/* Result */}
              {order.result && (
                <GlassCard className="border-emerald-500/10">
                  <h3 className="font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
                    <Eye size={16} className="text-emerald-400" /> Result
                  </h3>
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                    <p className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                      {order.result}
                    </p>
                  </div>
                </GlassCard>
              )}
            </motion.div>
          )}

          {/* ============ FILES TAB ============ */}
          {activeTab === 'files' && (
            <motion.div
              key="files"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <GlassCard>
                <h3 className="font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
                  <Paperclip size={16} className="text-[var(--accent)]" /> Files &amp; Attachments
                </h3>
                {attachments.length === 0 ? (
                  <div className="py-12 text-center">
                    <FileText size={32} className="mx-auto mb-3 text-[var(--muted)]" />
                    <p className="text-[var(--muted)] text-sm">No files attached to this order</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {attachments.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-[var(--card-border)] hover:bg-white/8 transition-colors"
                      >
                        <div className="flex-shrink-0">
                          {isImageType(file.fileType) ? (
                            <div className="w-10 h-10 rounded-lg bg-white/5 border border-[var(--card-border)] overflow-hidden flex items-center justify-center">
                              <Eye size={16} className="text-[var(--accent)]" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-white/5 border border-[var(--card-border)] flex items-center justify-center">
                              <FileText size={16} className="text-[var(--accent)]" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <a
                            href={file.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-[var(--foreground)] hover:underline truncate block"
                          >
                            {file.fileName}
                          </a>
                          <p className="text-xs text-[var(--muted)]">
                            {file.uploadedByName && <span>{file.uploadedByName} · </span>}
                            {file.fileType && <span>{file.fileType} · </span>}
                            {file.fileSize != null && <span>{formatFileSize(file.fileSize)} · </span>}
                            <span>{formatDate(file.createdAt)}</span>
                          </p>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2">
                          {isImageType(file.fileType) && (
                            <a
                              href={file.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-[var(--muted)] hover:text-[var(--foreground)]"
                            >
                              <Eye size={16} />
                            </a>
                          )}
                          <a
                            href={file.fileUrl}
                            download
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-[var(--muted)] hover:text-[var(--foreground)]"
                          >
                            <Download size={16} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </motion.div>
          )}

          {/* ============ MESSAGES TAB ============ */}
          {activeTab === 'messages' && (
            <motion.div
              key="messages"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <GlassCard padding="p-0">
                <div className="p-6 pb-0">
                  <h3 className="font-bold text-[var(--foreground)] flex items-center gap-2">
                    <MessageSquareText size={16} className="text-[var(--accent)]" /> Messages
                  </h3>
                </div>
                <div className="p-6">
                  {messages.length === 0 ? (
                    <div className="py-12 text-center">
                      <MessageSquareText size={32} className="mx-auto mb-3 text-[var(--muted)]" />
                      <p className="text-[var(--muted)] text-sm">No messages yet</p>
                      <p className="text-[var(--muted)] text-xs mt-1">Start the conversation below</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto mb-4 pr-1">
                      {messages.map((msg) => (
                        <div key={msg.id} className="flex flex-col">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-7 h-7 rounded-full bg-[var(--accent)]/15 flex items-center justify-center text-[var(--accent)] text-xs font-bold">
                              {msg.authorName?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <span className="text-sm font-medium text-[var(--foreground)]">{msg.authorName}</span>
                            <span className="text-[10px] text-[var(--muted)]">{formatDate(msg.createdAt)}</span>
                            {!msg.visible && (
                              <span className="text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">Internal</span>
                            )}
                          </div>
                          <div className="ml-9 p-3 rounded-xl bg-white/5 border border-[var(--card-border)]">
                            <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">
                              {msg.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Message input */}
                  <div className="border-t border-[var(--card-border)] pt-4 mt-2">
                    <textarea
                      className="w-full min-h-[80px] resize-y rounded-xl bg-white/5 border border-[var(--card-border)] p-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)]/40 transition-colors"
                      placeholder="Type your message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          handleSendMessage()
                        }
                      }}
                    />
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-[10px] text-[var(--muted)]">
                        {messageText.length > 0 ? `${messageText.length} chars` : 'Ctrl+Enter to send'}
                      </p>
                      <GlassButton
                        size="sm"
                        onClick={handleSendMessage}
                        disabled={sending || !messageText.trim()}
                      >
                        {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        Send
                      </GlassButton>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* ============ TIMELINE TAB ============ */}
          {activeTab === 'timeline' && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <GlassCard>
                <h3 className="font-bold text-[var(--foreground)] mb-6 flex items-center gap-2">
                  <Calendar size={16} className="text-[var(--accent)]" /> Order Timeline
                </h3>
                {timeline.length === 0 ? (
                  <div className="py-12 text-center">
                    <Clock size={32} className="mx-auto mb-3 text-[var(--muted)]" />
                    <p className="text-[var(--muted)] text-sm">No timeline events available</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-indigo-500/40 via-purple-500/30 to-transparent" />
                    <div className="space-y-5">
                      {timeline.map((event, idx) => {
                        const isLatest = idx === timeline.length - 1
                        const isNote = event.visible

                        return (
                          <motion.div
                            key={event.id}
                            className="flex gap-4 relative"
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.04 }}
                          >
                            <div className="flex-shrink-0 mt-0.5 relative z-10">
                              {isNote ? (
                                <div className="w-[15px] h-[15px] rounded-full bg-indigo-500/30 border-2 border-indigo-500 flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                </div>
                              ) : (
                                <div
                                  className={`w-[15px] h-[15px] rounded-full border-2 flex items-center justify-center ${
                                    isLatest
                                      ? 'bg-emerald-500/30 border-emerald-500'
                                      : 'bg-white/10 border-[var(--card-border)]'
                                  }`}
                                >
                                  <div
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      isLatest ? 'bg-emerald-400' : 'bg-white/50'
                                    }`}
                                  />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 pb-1">
                              <div
                                className={`p-3 rounded-xl ${
                                  isNote
                                    ? 'bg-indigo-500/5 border border-indigo-500/10'
                                    : 'bg-white/5 border border-[var(--card-border)]'
                                }`}
                              >
                                <p className="text-sm font-medium text-[var(--foreground)]">
                                  {event.content}
                                </p>
                                <div className="flex items-center gap-3 mt-1.5">
                                  <span className="text-xs text-[var(--muted)]">
                                    {formatDate(event.createdAt)}
                                  </span>
                                  <span className="text-xs text-[var(--muted)]">by {event.authorName}</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
