import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const adminPassword = await bcrypt.hash('admin123', 12)
  const resellerPassword = await bcrypt.hash('reseller123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@smartbdunlock.com' },
    update: {},
    create: {
      email: 'admin@smartbdunlock.com',
      password: adminPassword,
      name: 'Admin',
      role: 'admin',
      status: 'active',
      walletBalance: 10000,
    },
  })

  const reseller = await prisma.user.upsert({
    where: { email: 'reseller@smartbdunlock.com' },
    update: {},
    create: {
      email: 'reseller@smartbdunlock.com',
      password: resellerPassword,
      name: 'Reseller',
      role: 'reseller',
      status: 'active',
      walletBalance: 5000,
      resellerId: admin.id,
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
