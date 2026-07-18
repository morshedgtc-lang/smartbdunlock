'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface AuthUser {
  id: string
  userId: string
  email: string
  name: string
  role: string
  phone?: string
  status?: string
  walletBalance?: number
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  isAuthenticated: boolean
  refetch: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  refetch: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'same-origin' })
      if (!res.ok) {
        setUser(null)
        return
      }
      const data = await res.json()
      setUser(data?.user || null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, refetch: fetchSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function ProtectedRoute({ children, requiredRole }: { children: ReactNode; requiredRole?: string }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (requiredRole && user.role !== requiredRole) {
      router.replace(`/${user.role}/dashboard`)
    }
  }, [loading, user, router, requiredRole])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
      </div>
    )
  }

  if (!user) return null
  if (requiredRole && user.role !== requiredRole) return null

  return <>{children}</>
}
