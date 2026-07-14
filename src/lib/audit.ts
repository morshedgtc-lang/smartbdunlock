import { prisma } from './prisma'

interface AuditOptions {
  userId?: string
  userEmail?: string
  action: string
  entityType: string
  entityId?: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  ip?: string
  userAgent?: string
}

export async function auditLog(options: AuditOptions) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: options.userId || null,
        userEmail: options.userEmail || null,
        action: options.action,
        entityType: options.entityType,
        entityId: options.entityId || null,
        oldValues: options.oldValues ? JSON.stringify(options.oldValues) : null,
        newValues: options.newValues ? JSON.stringify(options.newValues) : null,
        ip: options.ip || null,
        userAgent: options.userAgent || null,
      },
    })
  } catch (error) {
    console.error('Audit log failed:', error)
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
}

export function getClientUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown'
}
