'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, FileIcon, Image, FileText } from 'lucide-react'

export interface FileData {
  name: string
  type: string
  size: number
  dataUrl: string
}

interface FileUploadProps {
  onChange: (files: FileData[]) => void
  maxFiles?: number
  maxSizeMB?: number
  accept?: string[]
  value?: FileData[]
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getTypeIcon(type: string) {
  if (type.startsWith('image/')) return <Image size={14} className="text-[var(--accent)]" />
  if (type.startsWith('text/') || type === 'application/json') return <FileText size={14} className="text-[var(--accent)]" />
  return <FileIcon size={14} className="text-[var(--muted)]" />
}

export function FileUpload({ onChange, maxFiles = 5, maxSizeMB = 10, accept, value = [] }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [progress, setProgress] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

  const validate = useCallback((file: File): string | null => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `"${file.name}" exceeds ${maxSizeMB}MB limit (${formatSize(file.size)})`
    }
    if (accept && accept.length > 0 && !accept.some(t => file.type === t || file.name.endsWith(t.replace('*', '')))) {
      return `"${file.name}" is not an accepted file type`
    }
    return null
  }, [maxSizeMB, accept])

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList)
    const newErrors: string[] = []

    if (value.length + files.length > maxFiles) {
      newErrors.push(`Maximum ${maxFiles} files allowed. You have ${value.length}.`)
      setErrors(newErrors)
      return
    }

    const validFiles: File[] = []
    for (const file of files) {
      const err = validate(file)
      if (err) {
        newErrors.push(err)
      } else {
        validFiles.push(file)
      }
    }

    if (newErrors.length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors([])
    setProgress(0)

    const results: FileData[] = []
    for (let i = 0; i < validFiles.length; i++) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(validFiles[i])
      })
      results.push({
        name: validFiles[i].name,
        type: validFiles[i].type,
        size: validFiles[i].size,
        dataUrl,
      })
      setProgress(Math.round(((i + 1) / validFiles.length) * 100))
    }

    if (progress !== 100) setProgress(100)
    setTimeout(() => setProgress(null), 400)
    onChange([...value, ...results])
  }, [value, maxFiles, validate, onChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    dragCounter.current = 0
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files)
    }
  }, [processFiles])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) setDragOver(false)
  }, [])

  const handleRemove = useCallback((index: number) => {
    const next = value.filter((_, i) => i !== index)
    onChange(next)
    setErrors([])
  }, [value, onChange])

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all duration-200
          ${dragOver
            ? 'border-[var(--accent)] bg-[var(--accent)]/5 scale-[1.02]'
            : 'border-[var(--card-border)] hover:border-[var(--accent)]/50 hover:bg-white/5'
          }
        `}
      >
        <motion.div animate={{ y: dragOver ? -4 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          <Upload size={28} className={`mx-auto mb-2 transition-colors ${dragOver ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`} />
          <p className="text-sm text-[var(--foreground)] font-medium">
            {dragOver ? 'Drop files here' : 'Drag & drop files or click to browse'}
          </p>
          <p className="text-xs text-[var(--muted)] mt-1">
            Max {maxFiles} file{maxFiles > 1 ? 's' : ''}, up to {maxSizeMB}MB each
            {accept && accept.length > 0 && ` \u00B7 ${accept.join(', ')}`}
          </p>
        </motion.div>
        <input
          ref={inputRef}
          type="file"
          multiple={maxFiles > 1}
          accept={accept?.join(',')}
          className="hidden"
          onChange={e => {
            if (e.target.files) processFiles(e.target.files)
            if (inputRef.current) inputRef.current.value = ''
          }}
        />
      </div>

      {progress !== null && (
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-[var(--accent)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1"
          >
            {errors.map((err, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                <X size={12} className="flex-shrink-0" />
                <span>{err}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {value.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence>
            {value.map((file, index) => (
              <motion.div
                key={`${file.name}-${index}`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className="flex items-center gap-3 rounded-xl bg-white/5 border border-[var(--card-border)] p-3"
              >
                {file.type.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.dataUrl} alt={file.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                    {getTypeIcon(file.type)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--foreground)] truncate">{file.name}</p>
                  <p className="text-xs text-[var(--muted)]">{formatSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleRemove(index) }}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-[var(--muted)] hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
