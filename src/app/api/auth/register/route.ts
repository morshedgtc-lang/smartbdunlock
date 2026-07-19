import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { registerSchema, validateBody } from '@/lib/validations'
import { generateUserId } from '@/lib/user-id'
import { generateOtp, hashOtp, otpExpiryDate } from '@/lib/otp'
import { sendOtpEmail, sendAdminApprovalNotification } from '@/lib/email'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'
import bcrypt from 'bcryptjs'

const registerAttempts = new Map<string, { count: number; resetTime: number }>()
const REGISTER_RATE_LIMIT = 3
const REGISTER_WINDOW = 60 * 60 * 1000

async function generateUniqueUsername(base: string): Promise<string> {
  const clean = base.toLowerCase().replace(/[^a-z0-9]/g, '')
  let candidate = clean
  let suffix = 1
  while (await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } })) {
    candidate = `${clean}${suffix}`
    suffix++
  }
  return candidate
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validation = validateBody(registerSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { name, email, password } = validation.data
    const displayName = name || email.split('@')[0]

    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
    const rateKey = `${ip}:${email}`
    const now = Date.now()
    const entry = registerAttempts.get(rateKey)

    if (entry && entry.count >= REGISTER_RATE_LIMIT && now < entry.resetTime) {
      const remaining = Math.ceil((entry.resetTime - now) / 1000)
      return NextResponse.json({ error: `Too many attempts. Try again in ${remaining}s` }, { status: 429 })
    }

    if (!entry || now > entry.resetTime) {
      registerAttempts.set(rateKey, { count: 1, resetTime: now + REGISTER_WINDOW })
    } else {
      entry.count++
    }

    const existingEmail = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (existingEmail) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const username = await generateUniqueUsername(email.split('@')[0])
    const hashedPassword = await bcrypt.hash(password, 12)
    const userId = await generateUserId()
    const otp = generateOtp()
    const otpHashVal = await hashOtp(otp)
    const otpExpire = otpExpiryDate()

    const user = await prisma.user.create({
      data: {
        userId,
        email,
        username,
        password: hashedPassword,
        name: displayName,
        role: 'reseller',
        status: 'pending_approval',
        walletBalance: 0,
        emailVerified: false,
        otpHash: otpHashVal,
        otpExpire,
        otpAttempts: 0,
      },
    })

    await sendOtpEmail({ to: email, name: displayName, otp })

    registerAttempts.delete(rateKey)

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'register.success',
      entityType: 'auth',
      entityId: user.id,
      newValues: { userId: user.userId, name: displayName, email, username, role: 'reseller' },
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
      email,
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
