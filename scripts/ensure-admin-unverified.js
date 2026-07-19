// Ensure admin account exists + emailVerified=false (OTP required)
// Idempotent — safe to run every deploy
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@smartbdunlock.com'
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123'

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } })

  if (!existing) {
    // Get next userId
    const latest = await prisma.user.findFirst({
      orderBy: { userId: 'desc' },
      where: { userId: { startsWith: 'SBU' } },
      select: { userId: true },
    })
    const base = 100000
    const numeric = latest ? parseInt(latest.userId.slice(3), 10) : base
    const userId = `SBU${String((Number.isFinite(numeric) ? numeric : base) + 1).padStart(6, '0')}`

    const hashed = await bcrypt.hash(adminPassword, 12)
    await prisma.user.create({
      data: {
        userId,
        email: adminEmail,
        username: adminEmail.split('@')[0],
        password: hashed,
        name: 'Admin',
        role: 'admin',
        status: 'active',
        walletBalance: 0,
        emailVerified: false,
      },
    })
    console.log(`[ADMIN] Created admin account: ${adminEmail}`)
  } else {
    // Always ensure correct password and role for admin
    const hashed = await bcrypt.hash(adminPassword, 12)
    await prisma.user.update({
      where: { email: adminEmail },
      data: { emailVerified: false, role: 'admin', status: 'active', password: hashed },
    })
    console.log(`[ADMIN] Reset admin account: ${adminEmail}`)
  }
}

main()
  .catch(e => { console.error('[ADMIN] Error:', e); process.exit(0) })
  .finally(() => prisma.$disconnect())
