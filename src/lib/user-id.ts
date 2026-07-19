import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { config } from './config'

async function nextSuffix(tx: Prisma.TransactionClient): Promise<number> {
  const latest = await tx.user.findFirst({
    orderBy: { userId: 'desc' },
    where: { userId: { startsWith: config.user.idPrefix } },
    select: { userId: true },
  })
  if (!latest) return config.user.idBase + 1
  const numeric = parseInt(latest.userId.slice(config.user.idPrefix.length), 10)
  return (Number.isFinite(numeric) ? numeric : config.user.idBase) + 1
}

export async function generateUserId(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const suffix = await nextSuffix(tx)
        const candidate = `${config.user.idPrefix}${String(suffix).padStart(6, '0')}`
        const exists = await tx.user.findUnique({ where: { userId: candidate } })
        if (exists) throw new Error('collision')
        return candidate
      })
    } catch {
      continue
    }
  }
  throw new Error('Failed to generate unique user ID')
}
