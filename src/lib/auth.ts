import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

let _secret: Uint8Array | null = null

function getSecret(): Uint8Array {
  if (_secret) return _secret
  const secret = process.env.JWT_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
      throw new Error('JWT_SECRET environment variable is required in production')
    }
    console.warn('⚠️ JWT_SECRET not set — using insecure fallback for development only')
    _secret = new TextEncoder().encode('dev-only-insecure-fallback-do-not-deploy')
    return _secret
  }
  _secret = new TextEncoder().encode(secret)
  return _secret
}

const COOKIE_NAME = 'sb_session'

export interface SessionUser {
  id: string
  userId: string
  email: string
  name: string
  role: string
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null

    const { payload } = await jwtVerify(token, getSecret())
    const jwtUser = payload.user as SessionUser
    if (!jwtUser?.id) return null

    try {
      const { prisma } = await import('@/lib/prisma')
      const dbUser = await prisma.user.findUnique({
        where: { id: jwtUser.id },
        select: { id: true, userId: true, email: true, name: true, role: true, status: true },
      })
      if (!dbUser || dbUser.status !== 'active') return null
      if (dbUser.role !== jwtUser.role || dbUser.name !== jwtUser.name || dbUser.userId !== jwtUser.userId) {
        const freshUser: SessionUser = {
          id: dbUser.id,
          userId: dbUser.userId,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
        }
        await createSession(freshUser)
        return freshUser
      }
    } catch {
      // DB check failed — fall back to JWT data
    }

    return jwtUser
  } catch {
    return null
  }
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSession()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth()
  if (user.role !== 'admin') {
    throw new Error('Forbidden')
  }
  return user
}
