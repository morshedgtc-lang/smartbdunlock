import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { config } from './config'

let _secret: Uint8Array | null = null

function getSecret(): Uint8Array {
  if (_secret) return _secret
  _secret = new TextEncoder().encode(config.jwt.secret())
  return _secret
}

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
    .setExpirationTime(config.jwt.expiry)
    .sign(getSecret())

  const cookieStore = await cookies()
  cookieStore.set(config.jwt.cookieName, token, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: config.jwt.cookieMaxAge,
  })
}

export async function getSession(): Promise<SessionUser | null> {
  try {
  const cookieStore = await cookies()
  const token = cookieStore.get(config.jwt.cookieName)?.value
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
  cookieStore.delete(config.jwt.cookieName)
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
