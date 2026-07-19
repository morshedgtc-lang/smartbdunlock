import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { config } from './config'

export function generateOtp(): string {
  const buf = crypto.randomBytes(4)
  const num = buf.readUInt32BE(0) % 1_000_000
  return String(num).padStart(config.otp.length, '0')
}

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, config.bcrypt.rounds)
}

export async function verifyOtp(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash)
}

export function otpExpiryDate(): Date {
  return new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000)
}

export function isOtpExpired(expiry: Date): boolean {
  return new Date() > expiry
}

export const { maxAttempts: OTP_MAX_ATTEMPTS, expiryMinutes: OTP_EXPIRY_MINUTES } = config.otp
