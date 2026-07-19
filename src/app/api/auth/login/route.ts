import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/auth'
import { loginSchema, validateBody } from '@/lib/validations'
import { generateOtp, hashOtp, otpExpiryDate } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/email'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'
import bcrypt from 'bcryptjs'
import { config } from '@/lib/config'
import { createChallengeToken } from '@/lib/mfa'

const loginAttempts = new Map<string, { count: number; resetTime: number }>()
const accountLockouts = new Map<string, { lockedUntil: number }>()

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

    const now = Date.now()

    const accountLock = accountLockouts.get(email)
    if (accountLock && now < accountLock.lockedUntil) {
      const remaining = Math.ceil((accountLock.lockedUntil - now) / 1000)
      await auditLog({
        action: 'login.account_locked',
        entityType: 'auth',
        newValues: { email },
        ip: getClientIp(request),
        userAgent: getClientUserAgent(request),
      })
      return NextResponse.json({ error: `Account locked. Try again in ${remaining}s` }, { status: 429 })
    }
    if (accountLock && now >= accountLock.lockedUntil) {
      accountLockouts.delete(email)
    }

    const rateKey = `${ip}:${email}`
    const entry = loginAttempts.get(rateKey)

    if (entry && entry.count >= config.rateLimit.loginMax && now < entry.resetTime) {
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
      loginAttempts.set(rateKey, { count: 1, resetTime: now + config.rateLimit.loginWindowMs })
    } else {
      entry.count++
    }

    const user = await prisma.user.findFirst({
      where: { email },
    })

    if (!user || !await bcrypt.compare(password, user.password)) {
      const accountEntry = loginAttempts.get(email) || { count: 0, resetTime: now + config.rateLimit.lockoutDurationMs }
      accountEntry.count++
      loginAttempts.set(email, accountEntry)

      if (accountEntry.count >= config.rateLimit.lockoutAttempts) {
        accountLockouts.set(email, { lockedUntil: now + config.rateLimit.lockoutDurationMs })
        loginAttempts.delete(email)
        await auditLog({
          action: 'login.account_locked',
          entityType: 'auth',
          newValues: { email, attempts: accountEntry.count },
          ip: getClientIp(request),
          userAgent: getClientUserAgent(request),
        })
        return NextResponse.json({ error: 'Account locked due to too many failed attempts. Try again in 15 minutes.' }, { status: 429 })
      }

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
        newValues: { email, attempt: accountEntry.count },
        ip: getClientIp(request),
        userAgent: getClientUserAgent(request),
      })
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 })
    }

    loginAttempts.delete(rateKey)
    loginAttempts.delete(email)
    accountLockouts.delete(email)

    if (!user.emailVerified) {
      const otp = generateOtp()
      const otpHashVal = await hashOtp(otp)
      const otpExpire = otpExpiryDate()

      await prisma.user.update({
        where: { id: user.id },
        data: { otpHash: otpHashVal, otpExpire, otpAttempts: 0 },
      })

      sendOtpEmail({ to: user.email, name: user.name, otp }).catch(err =>
        console.error('[EMAIL] Failed to send OTP on login:', err)
      )

      return NextResponse.json({
        error: 'Please verify your email before logging in',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      }, { status: 403 })
    }

    if (user.status === 'pending_approval') {
      return NextResponse.json({
        error: 'Your account is pending admin approval',
        code: 'PENDING_APPROVAL',
      }, { status: 403 })
    }

    if (user.status === 'suspended') {
      return NextResponse.json({
        error: 'Your account has been suspended. Contact support.',
        code: 'SUSPENDED',
      }, { status: 403 })
    }

    if (user.status === 'banned') {
      return NextResponse.json({
        error: 'Your account has been banned.',
        code: 'BANNED',
      }, { status: 403 })
    }

    if (user.totpEnabled) {
      const challengeToken = createChallengeToken(user.id)
      return NextResponse.json({
        error: 'Two-factor authentication required',
        code: 'TOTP_REQUIRED',
        challengeToken,
      }, { status: 403 })
    }

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
