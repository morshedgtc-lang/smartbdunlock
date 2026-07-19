import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyOtpSchema, validateBody } from '@/lib/validations'
import { verifyOtp, isOtpExpired, OTP_MAX_ATTEMPTS } from '@/lib/otp'
import { sendAdminApprovalNotification } from '@/lib/email'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validation = validateBody(verifyOtpSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { email, otp } = validation.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: 'No account found with this email' }, { status: 404 })
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: 'Email already verified' }, { status: 400 })
    }

    if (!user.otpHash || !user.otpExpire) {
      return NextResponse.json({ error: 'No verification code found. Please register again.' }, { status: 400 })
    }

    if (isOtpExpired(user.otpExpire)) {
      return NextResponse.json({ error: 'Verification code expired. Please request a new one.' }, { status: 400 })
    }

    if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
      return NextResponse.json({ error: 'Too many failed attempts. Please request a new code.' }, { status: 429 })
    }

    const valid = await verifyOtp(otp, user.otpHash)
    if (!valid) {
      await prisma.user.update({
        where: { id: user.id },
        data: { otpAttempts: { increment: 1 } },
      })

      await auditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'otp.verify_failed',
        entityType: 'auth',
        entityId: user.id,
        newValues: { attempts: user.otpAttempts + 1 },
        ip: getClientIp(request),
        userAgent: getClientUserAgent(request),
      })

      const remaining = OTP_MAX_ATTEMPTS - (user.otpAttempts + 1)
      return NextResponse.json({
        error: `Invalid code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining`,
      }, { status: 400 })
    }

    const now = new Date()
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: now,
        otpHash: null,
        otpExpire: null,
        otpAttempts: 0,
      },
    })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'otp.verify_success',
      entityType: 'auth',
      entityId: user.id,
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    await sendAdminApprovalNotification({
      name: user.name,
      email: user.email,
      username: user.username,
      userId: user.userId,
    })

    return NextResponse.json({
      success: true,
      message: 'Email verified! Your account is pending admin approval.',
    })
  } catch (error) {
    console.error('OTP verification error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
