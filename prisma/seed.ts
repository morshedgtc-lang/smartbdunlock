import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function nextPublicUserId(): Promise<string> {
  const latest = await prisma.user.findFirst({
    orderBy: { userId: 'desc' },
    where: { userId: { startsWith: 'SBU' } },
    select: { userId: true },
  })
  const base = 100000
  const numeric = latest ? parseInt(latest.userId.slice(3), 10) : base
  return `SBU${String((Number.isFinite(numeric) ? numeric : base) + 1).padStart(6, '0')}`
}

async function main() {
  console.log('Seeding database...')

  const adminPassword = await bcrypt.hash('admin123', 12)
  const resellerPassword = await bcrypt.hash('reseller123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@smartbdunlock.com' },
    update: {},
    create: {
      userId: await nextPublicUserId(),
      email: 'admin@smartbdunlock.com',
      username: 'admin',
      password: adminPassword,
      name: 'Admin',
      role: 'admin',
      status: 'active',
      walletBalance: 10000,
      emailVerified: true,
    },
  })

  const reseller = await prisma.user.upsert({
    where: { email: 'reseller@smartbdunlock.com' },
    update: {},
    create: {
      userId: await nextPublicUserId(),
      email: 'reseller@smartbdunlock.com',
      username: 'reseller',
      password: resellerPassword,
      name: 'Reseller',
      role: 'reseller',
      status: 'active',
      walletBalance: 5000,
      resellerId: admin.id,
      emailVerified: true,
    },
  })

  console.log('Created admin:', admin.email)
  console.log('Created reseller:', reseller.email)

  const category = await prisma.serviceCategory.upsert({
    where: { name: 'Network Unlock' },
    update: {},
    create: { name: 'Network Unlock' },
  })

  await prisma.service.upsert({
    where: { id: 'seed-samsung-unlock' },
    update: {},
    create: {
      id: 'seed-samsung-unlock',
      name: 'Samsung Network Unlock',
      description: 'Unlock Samsung devices from any carrier',
      type: 'unlock',
      cost: 15,
      sellingPrice: 25,
      processingTime: '1-24h',
      status: 'active',
      categoryId: category.id,
    },
  })

  console.log('Seed complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
