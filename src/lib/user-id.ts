import { prisma } from '@/lib/prisma'

const PREFIX = 'SBU'
const BASE = 100000

async function nextSuffix(tx: { user: { findFirst: (args: unknown) => Promise<{ userId: string } | null> } }): Promise<number> {
  const latest = await tx.user.findFirst({
    orderBy: { userId: 'desc' },
    where: { userId: { startsWith: PREFIX } },
    select: { userId: true },
  })
  if (!latest) return BASE + 1
  const numeric = parseInt(latest.userId.slice(PREFIX.length), 10)
  return (Number.isFinite(numeric) ? numeric : BASE) + 1
}

export async function generateUserId(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const suffix = await nextSuffix(tx as never)
        const candidate = `${PREFIX}${String(suffix).padStart(6, '0')}`
        // Probe existence within the same transaction for serializable safety.
        const exists = await tx.user.findUnique({ where: { userId: candidate } })
        if (exists) throw new Error('collision')
        return candidate
      })
    } catch {
      // Race on concurrent signups: retry with fresh suffix read.
      continue
    }
  }
  throw new Error('Failed to generate unique user ID')
}
