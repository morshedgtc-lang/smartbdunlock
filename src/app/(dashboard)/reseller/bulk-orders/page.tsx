'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { motion } from 'framer-motion'
import { Upload, Loader2, FileText, CheckCircle, XCircle, Download } from 'lucide-react'
import { useState, useRef } from 'react'

interface BulkBatch {
  id: string
  fileName: string
  totalRecords: number
  successfulRecords: number
  failedRecords: number
  status: string
  serviceName?: string
  createdAt: string
  completedAt?: string
}

interface UploadPreview {
  total: number
  validCount: number
  invalidCount: number
  duplicateCount: number
  imeis: string[]
  errors: { imei: string; line: number; error: string }[]
}

interface ServiceItem {
  id: string
  name: string
  sellingPrice: number
  status: string
}

export default function BulkOrdersPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<UploadPreview | null>(null)
  const [selectedService, setSelectedService] = useState('')
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [fileName, setFileName] = useState('')
  const [page, setPage] = useState(1)

  const { data: batchesData, loading, refetch } = useApi<{ batches: BulkBatch[]; pagination: { total: number; pages: number } }>({ url: `/api/bulk-orders?page=${page}&limit=10` })
  const { data: servicesData } = useApi<{ services: ServiceItem[] }>({ url: '/api/services?status=active' })

  const batches = batchesData?.batches || []
  const services = (servicesData?.services || []).filter((s: ServiceItem) => s.status === 'active')
  const balance = user?.walletBalance ?? 0

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'csv' && ext !== 'txt') {
      toast('error', 'Only CSV and TXT files are supported')
      return
    }

    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = reader.result as string
        const res = await fetch('/api/bulk-orders/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileContent: base64, fileName: file.name }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setPreview(data)
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Upload failed')
      setUploading(false)
    }
  }

  const handleProcess = async () => {
    if (!preview || !selectedService) {
      toast('error', 'Please select a service')
      return
    }
    const service = services.find((s: ServiceItem) => s.id === selectedService)
    const totalCost = (service?.sellingPrice || 0) * preview.imeis.length
    if (totalCost > balance) {
      toast('error', `Insufficient balance. Required: $${totalCost.toFixed(2)}`)
      return
    }

    setProcessing(true)
    try {
      const res = await fetch('/api/bulk-orders/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId: selectedService, imeis: preview.imeis }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast('success', `Bulk upload complete: ${data.successful} succeeded, ${data.failed} failed`)
      setPreview(null)
      setSelectedService('')
      setFileName('')
      refetch()
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Processing failed')
    } finally {
      setProcessing(false)
    }
  }

  const downloadErrors = () => {
    if (!preview?.errors.length) return
    const csv = 'IMEI,Line,Error\n' + preview.errors.map(e => `${e.imei},${e.line},"${e.error}"`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bulk-errors-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <Header title="Bulk IMEI Upload" subtitle="Upload multiple IMEIs at once" />
      <div className="p-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard glow>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm text-[var(--muted)] mb-1">Available Balance</p>
                <p className="text-3xl font-bold text-[var(--foreground)]">${balance.toLocaleString()}</p>
              </div>
              <GlassButton onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Upload CSV/TXT
              </GlassButton>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileSelect} />
            </div>
          </GlassCard>
        </motion.div>

        {preview && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard>
              <h3 className="font-bold text-[var(--foreground)] mb-4">Preview: {fileName}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 glass rounded-lg">
                  <p className="text-2xl font-bold text-[var(--foreground)]">{preview.total}</p>
                  <p className="text-xs text-[var(--muted)]">Total</p>
                </div>
                <div className="text-center p-3 glass rounded-lg">
                  <p className="text-2xl font-bold text-green-500">{preview.validCount}</p>
                  <p className="text-xs text-[var(--muted)]">Valid</p>
                </div>
                <div className="text-center p-3 glass rounded-lg">
                  <p className="text-2xl font-bold text-red-500">{preview.invalidCount}</p>
                  <p className="text-xs text-[var(--muted)]">Invalid</p>
                </div>
                <div className="text-center p-3 glass rounded-lg">
                  <p className="text-2xl font-bold text-yellow-500">{preview.duplicateCount}</p>
                  <p className="text-xs text-[var(--muted)]">Duplicates</p>
                </div>
              </div>

              {preview.errors.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-red-400">{preview.errors.length} errors found</p>
                    <GlassButton size="sm" variant="secondary" onClick={downloadErrors}>
                      <Download size={14} /> Download Errors
                    </GlassButton>
                  </div>
                  <div className="max-h-40 overflow-y-auto text-xs space-y-1">
                    {preview.errors.slice(0, 20).map((e, i) => (
                      <div key={i} className="flex gap-2 text-red-400">
                        <span>Line {e.line}:</span>
                        <span>{e.imei || '(empty)'}</span>
                        <span>- {e.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  className="glass-input flex-1"
                  value={selectedService}
                  onChange={e => setSelectedService(e.target.value)}
                >
                  <option value="">Select service...</option>
                  {services.map((s: ServiceItem) => (
                    <option key={s.id} value={s.id}>{s.name} - ${s.sellingPrice.toFixed(2)}</option>
                  ))}
                </select>
                <GlassButton onClick={handleProcess} disabled={processing || !selectedService || preview.validCount === 0}>
                  {processing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  Process {preview.validCount} Orders
                </GlassButton>
                <GlassButton variant="secondary" onClick={() => { setPreview(null); setFileName('') }}>
                  Cancel
                </GlassButton>
              </div>
            </GlassCard>
          </motion.div>
        )}

        <GlassCard padding="p-0">
          <div className="px-6 py-4 border-b border-[var(--card-border)]">
            <h3 className="font-bold text-[var(--foreground)]">Upload History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">File</th>
                  <th className="text-left py-3 px-4 text-[var(--muted)] font-medium">Service</th>
                  <th className="text-right py-3 px-4 text-[var(--muted)] font-medium">Total</th>
                  <th className="text-right py-3 px-4 text-[var(--muted)] font-medium">Success</th>
                  <th className="text-right py-3 px-4 text-[var(--muted)] font-medium">Failed</th>
                  <th className="text-center py-3 px-4 text-[var(--muted)] font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-[var(--muted)] font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="py-12 text-center"><Loader2 size={24} className="animate-spin mx-auto text-[var(--muted)]" /></td></tr>
                ) : batches.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center"><FileText size={40} className="mx-auto text-[var(--muted)] mb-3 opacity-50" /><p className="text-[var(--muted)]">No uploads yet</p></td></tr>
                ) : (
                  batches.map((b: BulkBatch, i: number) => (
                    <motion.tr key={b.id} className="border-b border-[var(--card-border)] hover:bg-white/5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                      <td className="py-3 px-4 text-[var(--foreground)]">{b.fileName}</td>
                      <td className="py-3 px-4 text-[var(--foreground)]">{b.serviceName || '—'}</td>
                      <td className="py-3 px-4 text-right text-[var(--foreground)]">{b.totalRecords}</td>
                      <td className="py-3 px-4 text-right text-green-500">{b.successfulRecords}</td>
                      <td className="py-3 px-4 text-right text-red-500">{b.failedRecords}</td>
                      <td className="py-3 px-4 text-center"><StatusBadge status={b.status} /></td>
                      <td className="py-3 px-4 text-right text-xs text-[var(--muted)]">{new Date(b.createdAt).toLocaleDateString()}</td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {batchesData?.pagination && batchesData.pagination.pages > 1 && (
            <div className="flex justify-center gap-2 p-4">
              <GlassButton size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</GlassButton>
              <span className="text-sm text-[var(--muted)] py-1">Page {page} of {batchesData.pagination.pages}</span>
              <GlassButton size="sm" variant="secondary" disabled={page >= batchesData.pagination.pages} onClick={() => setPage(p => p + 1)}>Next</GlassButton>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
