'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { BottomNav } from '@/components/layout/BottomNav'
import { ProtectedRoute } from '@/lib/api'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="reseller">
      <DashboardLayout>{children}</DashboardLayout>
      <BottomNav />
    </ProtectedRoute>
  )
}
