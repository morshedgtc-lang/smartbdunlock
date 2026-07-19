const env = (key: string, fallback?: string): string => {
  const val = process.env[key]
  if (!val && fallback === undefined) {
    throw new Error(`Required environment variable ${key} is not set`)
  }
  return val ?? fallback!
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',

  jwt: {
    secret: () => env('JWT_SECRET'),
    cookieName: 'sb_session' as const,
    expiry: '7d' as const,
    cookieMaxAge: 60 * 60 * 24 * 7,
  },

  otp: {
    length: 6,
    expiryMinutes: 10,
    maxAttempts: 5,
    resendCooldownSeconds: 60,
  },

  bcrypt: {
    rounds: 12,
  },

  rateLimit: {
    globalMax: 100,
    globalWindowMs: 60 * 1000,
    loginMax: 5,
    loginWindowMs: 15 * 60 * 1000,
    registerMax: 3,
    registerWindowMs: 60 * 60 * 1000,
    lockoutAttempts: 5,
    lockoutDurationMs: 15 * 60 * 1000,
    mapCleanupThreshold: 10000,
  },

  upload: {
    maxFileSize: 10 * 1024 * 1024,
    maxFilesPerRequest: 5,
    allowedTypes: new Set([
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'text/plain', 'text/csv',
      'application/json',
    ]),
    blockedExtensions: new Set([
      'html', 'htm', 'svg', 'exe', 'bat', 'cmd', 'com', 'msi', 'scr',
      'pif', 'vbs', 'js', 'ws', 'wsh', 'ps1', 'sh', 'bash',
    ]),
  },

  email: {
    smtpTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  },

  mfa: {
    issuer: 'SmartBDUnlock',
    totpDigits: 6,
    totpPeriod: 30,
    backupCodesCount: 8,
  },

  user: {
    idPrefix: 'SBU' as const,
    idBase: 100000,
  },

  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },

  cors: {
    maxAge: '86400',
    allowedMethods: 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
  },
} as const
