import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/auth'
import { loginSchema, validateBody } from '@/lib/validations'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'
import bcrypt from 'bcryptjs'

const loginAttempts = new Map<string, { count: number; resetTime: number }>()
const LOGIN_RATE_LIMIT = 5
const LOGIN_WINDOW = 15 * 60 * 1000

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validation = validateBody(loginSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { email, password } = validation.data

    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
    const rateKey = `${ip}:${email}`
    const now = Date.now()
    const entry = loginAttempts.get(rateKey)

    if (entry && entry.count >= LOGIN_RATE_LIMIT && now < entry.resetTime) {
      const remaining = Math.ceil((entry.resetTime - now) / 1000)
      await auditLog({
        action: 'login.rate_limited',
        entityType: 'auth',
        ip: getClientIp(request),
        userAgent: getClientUserAgent(request),
      })
      return NextResponse.json({ error: `Too many login attempts. Try again in ${remaining}s` }, { status: 429 })
    }

    if (!entry || now > entry.resetTime) {
      loginAttempts.set(rateKey, { count: 1, resetTime: now + LOGIN_WINDOW })
    } else {
      entry.count++
    }

    const user = await prisma.user.findFirst({
      where: { email, status: 'active' },
    })

    if (!user || !await bcrypt.compare(password, user.password)) {
      if (user && user.status !== 'active') {
        await auditLog({
          userId: user.id,
          userEmail: user.email,
          action: 'login.inactive_account',
          entityType: 'auth',
          entityId: user.id,
          ip: getClientIp(request),
          userAgent: getClientUserAgent(request),
        })
      }
      await auditLog({
        action: 'login.failed',
        entityType: 'auth',
        newValues: { email },
        ip: getClientIp(request),
        userAgent: getClientUserAgent(request),
      })
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 })
    }

    loginAttempts.delete(rateKey)

    await createSession({
      id: user.id,
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
    })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'login.success',
      entityType: 'auth',
      entityId: user.id,
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
