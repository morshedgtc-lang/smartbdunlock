import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    if (body.confirm !== 'DELETE_ALL_DATA') {
      return NextResponse.json({ error: 'Send { "confirm": "DELETE_ALL_DATA" }' }, { status: 400 })
    }

    const tables = [
      'AuditLog', 'Log', 'OrderAttachment', 'OrderCustomFieldValue',
      'OrderNote', 'SupplierJob', 'SupplierApiLog', 'SyncHistory',
      'SupplierService', 'PricingRule', 'BulkOrderBatch', 'DepositRequest',
      'ApiKey', 'Notification', 'Transaction', 'Supplier',
      'ServiceCustomField', 'Service', 'ServiceCategory',
      'SystemSetting', 'Order', 'User',
    ]

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`)
      } catch {
        // skip if table doesn't exist
      }
    }

    // Re-seed admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@smartbdunlock.com'
    const adminPassword = await bcrypt.hash('admin123', 12)
    const latest = await prisma.user.findFirst({
      orderBy: { userId: 'desc' },
      where: { userId: { startsWith: 'SBU' } },
      select: { userId: true },
    })
    const base = 100000
    const numeric = latest ? parseInt(latest.userId.slice(3), 10) : base
    const adminUserId = `SBU${String((Number.isFinite(numeric) ? numeric : base) + 1).padStart(6, '0')}`

    const admin = await prisma.user.create({
      data: {
        userId: adminUserId,
        email: adminEmail,
        username: adminEmail.split('@')[0],
        password: adminPassword,
        name: 'Admin',
        role: 'admin',
        status: 'active',
        walletBalance: 0,
        emailVerified: false,
      },
    })

    // Re-seed reseller
    const resellerPassword = await bcrypt.hash('reseller123', 12)
    const resellerUserId = `SBU${String((numeric || base) + 2).padStart(6, '0')}`
    await prisma.user.create({
      data: {
        userId: resellerUserId,
        email: 'reseller@smartbdunlock.com',
        username: 'reseller',
        password: resellerPassword,
        name: 'Reseller',
        role: 'reseller',
        status: 'active',
        walletBalance: 0,
        emailVerified: false,
        resellerId: admin.id,
      },
    })

    // Re-seed category + service
    const category = await prisma.serviceCategory.create({
      data: { name: 'Network Unlock' },
    })
    await prisma.service.create({
      data: {
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

    return NextResponse.json({
      success: true,
      message: 'Database reset complete. Admin and reseller accounts created.',
      admin: { email: adminEmail, password: 'admin123' },
      reseller: { email: 'reseller@smartbdunlock.com', password: 'reseller123' },
    })
  } catch (error) {
    console.error('DB reset error:', error)
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 })
  }
}
