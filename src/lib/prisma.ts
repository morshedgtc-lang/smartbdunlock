import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    errorFormat: 'minimal',
  })
}

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 200,
): Promise<T> {
  let lastError: Error | undefined
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      const isConnectionError =
        lastError.message?.includes('P1001') ||
        lastError.message?.includes('P1008') ||
        lastError.message?.includes('ECONNREFUSED') ||
        lastError.message?.includes('connect EHOSTUNREACH')
      if (!isConnectionError || attempt === maxRetries - 1) throw lastError
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)))
    }
  }
  throw lastError
}
