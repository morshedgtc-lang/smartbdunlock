// One-time script: set admin emailVerified=false so OTP flow triggers
// Safe to run repeatedly (idempotent)
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@smartbdunlock.com'
  const result = await prisma.user.updateMany({
    where: { email: adminEmail, emailVerified: true },
    data: { emailVerified: false },
  })
  if (result.count > 0) {
    console.log(`[ADMIN] Reset emailVerified=false for ${adminEmail}`)
  } else {
    console.log(`[ADMIN] ${adminEmail} already unverified or not found`)
  }
}

main()
  .catch(e => { console.error('[ADMIN] Error:', e); process.exit(0) })
  .finally(() => prisma.$disconnect())
