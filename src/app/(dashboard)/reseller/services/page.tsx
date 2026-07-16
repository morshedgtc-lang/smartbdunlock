'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassDropdown, DropdownOption } from '@/components/ui/GlassDropdown'
import { useApi } from '@/hooks/useApi'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2, Package, Clock, DollarSign, Shield, Eye } from 'lucide-react'
import { useState, useMemo } from 'react'
import Link from 'next/link'

interface ServiceItem {
  id: string
  name: string
  description?: string
  type: string
  sellingPrice: number
  processingTime?: string
  status: string
  clientVisible?: boolean
  categoryId?: string
  categoryName?: string
  customFields?: { visibleToClient: boolean }[]
}

interface CategoryItem {
  id: string
  name: string
}

const TYPE_ICONS: Record<string, string> = {
  unlock: '🔓',
  flash: '⚡',
  repair: '🔧',
  imei: '📱',
}

const TYPE_COLORS: Record<string, string> = {
  unlock: 'from-indigo-500 to-purple-500',
  flash: 'from-amber-500 to-orange-500',
  repair: 'from-emerald-500 to-teal-500',
  imei: 'from-blue-500 to-cyan-500',
}

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'time_asc', label: 'Fastest First' },
  { value: 'name_asc', label: 'Name: A-Z' },
]

export default function ClientServicesPage() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sortBy, setSortBy] = useState('default')
  const { data, loading, error } = useApi<{ services: ServiceItem[] }>({ url: '/api/services' })
  const { data: catData } = useApi<{ categories: CategoryItem[] }>({ url: '/api/service-categories' })
  const { data: walletData } = useApi<{ balance: number }>({ url: '/api/wallet' })

  const services = useMemo(() => {
    const allSvc = data?.services || []
    return allSvc.filter((s: ServiceItem) => s.status === 'active' && s.clientVisible !== false)
  }, [data])

  const categories = catData?.categories || []
  const balance = walletData?.balance ?? 0

  const filtered = useMemo(() => {
    let result = services
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((s: ServiceItem) =>
        s.name.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.type.toLowerCase().includes(q)
      )
    }
    if (categoryFilter) {
      result = result.filter((s: ServiceItem) => s.categoryId === categoryFilter)
    }
    result = [...result].sort((a: ServiceItem, b: ServiceItem) => {
      switch (sortBy) {
        case 'price_asc': return a.sellingPrice - b.sellingPrice
        case 'price_desc': return b.sellingPrice - a.sellingPrice
        case 'name_asc': return a.name.localeCompare(b.name)
        case 'time_asc': {
          const parseTime = (t: string) => { const m = t?.match(/(\d+)/); return m ? parseInt(m[1]) : 9999 }
          return parseTime(a.processingTime || '') - parseTime(b.processingTime || '')
        }
        default: return 0
      }
    })
    return result
  }, [services, search, categoryFilter, sortBy])

  const categoryOptions: DropdownOption[] = [
    { value: '', label: 'All Categories' },
    ...categories.map((c: CategoryItem) => ({ value: c.id, label: c.name })),
  ]

  if (loading) {
    return (
      <div>
        <Header title="Services" subtitle="Loading..." />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Header title="Services" />
        <div className="p-6 flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Services" subtitle={`${services.length} services available`} />
      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              className="glass-input pl-9 w-full"
              placeholder="Search services..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="w-56">
            <GlassDropdown
              options={categoryOptions}
              value={categoryFilter}
              onChange={setCategoryFilter}
              placeholder="All Categories"
              size="sm"
            />
          </div>
          <div className="w-48">
            <GlassDropdown
              options={SORT_OPTIONS}
              value={sortBy}
              onChange={setSortBy}
              placeholder="Sort by"
              size="sm"
            />
          </div>
        </div>

        {/* Balance Card */}
        <GlassCard glow premium padding="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--muted)]">Available Balance</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">${balance.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30 flex items-center justify-center">
              <DollarSign size={22} className="text-white" />
            </div>
          </div>
        </GlassCard>

        {/* Service Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Package size={48} className="text-[var(--muted)] mb-4 opacity-40" />
            <p className="text-[var(--muted)] text-lg font-medium">No services found</p>
            <p className="text-[var(--muted)] text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence mode="popLayout">
              {filtered.map((service: ServiceItem, i: number) => {
                const typeColor = TYPE_COLORS[service.type] || TYPE_COLORS.unlock
                const typeIcon = TYPE_ICONS[service.type] || '📦'
                const fieldCount = service.customFields?.filter((f: { visibleToClient: boolean }) => f.visibleToClient).length || 0

                return (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <GlassCard hover premium padding="p-0" className="h-full flex flex-col overflow-hidden">
                      {/* Top gradient bar */}
                      <div className={`h-1.5 bg-gradient-to-r ${typeColor}`} />

                      <div className="p-5 flex flex-col flex-1">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${typeColor} shadow-lg flex items-center justify-center text-lg`}>
                              {typeIcon}
                            </div>
                            <div>
                              <h3 className="font-bold text-[var(--foreground)] text-[15px] leading-tight">{service.name}</h3>
                              <p className="text-xs text-[var(--muted)] mt-0.5 capitalize">{service.type}</p>
                            </div>
                          </div>
                          {service.categoryName && (
                            <span className="text-[10px] px-2 py-1 rounded-lg bg-white/5 text-[var(--muted)] font-medium whitespace-nowrap">
                              {service.categoryName}
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        {service.description && (
                          <p className="text-sm text-[var(--muted)] mb-4 line-clamp-2 leading-relaxed">
                            {service.description}
                          </p>
                        )}

                        {/* Meta */}
                        <div className="flex items-center gap-4 mb-4 text-xs text-[var(--muted)]">
                          {service.processingTime && (
                            <div className="flex items-center gap-1.5">
                              <Clock size={13} className="text-[var(--accent)]" />
                              <span>{service.processingTime}</span>
                            </div>
                          )}
                          {fieldCount > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Shield size={13} className="text-[var(--accent)]" />
                              <span>{fieldCount} field{fieldCount !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-3 border-t border-[var(--card-border)]">
                          <div>
                            <p className="text-xs text-[var(--muted)]">Price</p>
                            <p className="text-lg font-bold text-[var(--foreground)]">
                              ${service.sellingPrice?.toFixed(2)}
                            </p>
                          </div>
                          <Link href={`/reseller/services/${service.id}`}>
                            <GlassButton size="sm">
                              <Eye size={14} /> View Details
                            </GlassButton>
                          </Link>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
