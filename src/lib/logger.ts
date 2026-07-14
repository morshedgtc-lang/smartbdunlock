import { prisma } from './prisma'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogOptions {
  level?: LogLevel
  source?: string
  details?: Record<string, unknown>
  userId?: string
  ip?: string
  userAgent?: string
}

export async function log(message: string, options: LogOptions = {}) {
  try {
    await prisma.log.create({
      data: {
        level: options.level || 'info',
        message,
        source: options.source || 'system',
        details: options.details ? JSON.stringify(options.details) : null,
        userId: options.userId || null,
        ip: options.ip || null,
        userAgent: options.userAgent || null,
      },
    })
  } catch (error) {
    console.error('Logger failed:', error)
  }
}

export const logger = {
  info: (message: string, opts?: Omit<LogOptions, 'level'>) =>
    log(message, { ...opts, level: 'info' }),
  warn: (message: string, opts?: Omit<LogOptions, 'level'>) =>
    log(message, { ...opts, level: 'warn' }),
  error: (message: string, opts?: Omit<LogOptions, 'level'>) =>
    log(message, { ...opts, level: 'error' }),
  debug: (message: string, opts?: Omit<LogOptions, 'level'>) =>
    log(message, { ...opts, level: 'debug' }),
}
