const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    // Mark the failed migration as rolled back
    await prisma.$executeRaw`UPDATE _prisma_migrations SET status = 'rolled_back', finished_at = NOW() WHERE migration_name = '20250720_add_system_setting_indexes' AND status = 'failed'`
    console.log('Marked migration as rolled back')
    
    // Check if the indexes exist already
    const indexes = await prisma.$queryRaw`SELECT indexname FROM pg_indexes WHERE tablename = 'User' AND indexname IN ('Transaction_createdAt_idx', 'Service_status_idx', 'User_status_idx', 'SystemSetting_key_idx')`
    console.log('Existing indexes:', indexes)

    // Check if system_settings table exists
    const tables = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE tablename = 'system_settings'`
    console.log('system_settings table:', tables)
    
  } catch (e) {
    console.error('Error:', e.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
