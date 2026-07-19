import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resendOtpSchema, validateBody } from '@/lib/validations'
import { generateOtp, hashOtp, otpExpiryDate } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/email'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'

const resendAttempts = new Map<string, { count: number; resetTime: number }>()
const RESEND_COOLDOWN = 60 * 1000

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validation = validateBody(resendOtpSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { email } = validation.data

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rateKey = `${ip}:${email}`
    const now = Date.now()
    const entry = resendAttempts.get(rateKey)

    if (entry && now < entry.resetTime) {
      const remaining = Math.ceil((entry.resetTime - now) / 1000)
      return NextResponse.json({ error: `Wait ${remaining}s before requesting a new code` }, { status: 429 })
    }

    resendAttempts.set(rateKey, { count: (entry?.count || 0) + 1, resetTime: now + RESEND_COOLDOWN })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: 'No account found with this email' }, { status: 404 })
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: 'Email already verified' }, { status: 400 })
    }

    const otp = generateOtp()
    const otpHashVal = await hashOtp(otp)
    const otpExpire = otpExpiryDate()

    await prisma.user.update({
      where: { id: user.id },
      data: { otpHash: otpHashVal, otpExpire, otpAttempts: 0 },
    })

    sendOtpEmail({ to: email, name: user.name, otp }).catch(err =>
      console.error('[EMAIL] Failed to resend OTP:', err)
    )

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'otp.resend',
      entityType: 'auth',
      entityId: user.id,
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({
      success: true,
      message: 'New verification code sent',
    })
  } catch (error) {
    console.error('Resend OTP error:', error)
    return NextResponse.json({ error: 'Failed to resend code' }, { status: 500 })
  }
}
