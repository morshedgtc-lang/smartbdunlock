import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const OTP_LENGTH = 6
const OTP_EXPIRY_MINUTES = 10
const OTP_MAX_ATTEMPTS = 5
const BCRYPT_ROUNDS = 12

export function generateOtp(): string {
  const buf = crypto.randomBytes(4)
  const num = buf.readUInt32BE(0) % 1_000_000
  return String(num).padStart(OTP_LENGTH, '0')
}

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, BCRYPT_ROUNDS)
}

export async function verifyOtp(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash)
}

export function otpExpiryDate(): Date {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
}

export function isOtpExpired(expiry: Date): boolean {
  return new Date() > expiry
}

export { OTP_MAX_ATTEMPTS, OTP_EXPIRY_MINUTES }
