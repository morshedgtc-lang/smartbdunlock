'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ProtectedRoute } from '@/lib/api'

export default function ResellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="reseller">
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  )
}
