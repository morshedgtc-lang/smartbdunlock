import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/auth'
import { registerSchema, validateBody } from '@/lib/validations'
import { generateUserId } from '@/lib/user-id'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'
import bcrypt from 'bcryptjs'

const registerAttempts = new Map<string, { count: number; resetTime: number }>()
const REGISTER_RATE_LIMIT = 3
const REGISTER_WINDOW = 60 * 60 * 1000

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validation = validateBody(registerSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { name, email, phone, password } = validation.data

    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
    const rateKey = `${ip}:${email}`
    const now = Date.now()
    const entry = registerAttempts.get(rateKey)

    if (entry && entry.count >= REGISTER_RATE_LIMIT && now < entry.resetTime) {
      const remaining = Math.ceil((entry.resetTime - now) / 1000)
      await auditLog({
        action: 'register.rate_limited',
        entityType: 'auth',
        ip: getClientIp(request),
        userAgent: getClientUserAgent(request),
      })
      return NextResponse.json({ error: `Too many registration attempts. Try again in ${remaining}s` }, { status: 429 })
    }

    if (!entry || now > entry.resetTime) {
      registerAttempts.set(rateKey, { count: 1, resetTime: now + REGISTER_WINDOW })
    } else {
      entry.count++
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      await auditLog({
        action: 'register.duplicate_email',
        entityType: 'auth',
        newValues: { email },
        ip: getClientIp(request),
        userAgent: getClientUserAgent(request),
      })
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const userId = await generateUserId()

    const user = await prisma.user.create({
      data: {
        userId,
        email,
        password: hashedPassword,
        name,
        phone: phone || null,
        role: 'reseller',
        status: 'active',
        walletBalance: 0,
      },
    })

    registerAttempts.delete(rateKey)

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
      action: 'register.success',
      entityType: 'auth',
      entityId: user.id,
      newValues: { userId: user.userId, name, email, role: 'reseller' },
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({
      user: {
        id: user.id,
        userId: user.userId,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
