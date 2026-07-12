import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@smartbdunlock.com' },
    update: {},
    create: {
      email: 'admin@smartbdunlock.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'admin',
      phone: '+1234567890',
      walletBalance: 10000,
    },
  })

  // Create reseller user
  const resellerPassword = await bcrypt.hash('reseller123', 12)
  const reseller = await prisma.user.upsert({
    where: { email: 'reseller@smartbdunlock.com' },
    update: {},
    create: {
      email: 'reseller@smartbdunlock.com',
      password: resellerPassword,
      name: 'Reseller User',
      role: 'reseller',
      phone: '+1234567891',
      walletBalance: 5000,
    },
  })

  // Create suppliers
  const supplier1 = await prisma.supplier.upsert({
    where: { id: 'supplier-1' },
    update: {},
    create: {
      id: 'supplier-1',
      name: 'UnlockBase',
      email: 'support@unlockbase.com',
      website: 'https://unlockbase.com',
      type: 'api',
      status: 'active',
      successRate: 98.5,
      totalOrders: 1250,
      priority: 1,
      apiKey: 'demo-api-key-1',
    },
  })

  const supplier2 = await prisma.supplier.upsert({
    where: { id: 'supplier-2' },
    update: {},
    create: {
      id: 'supplier-2',
      name: 'DoctorSIM',
      email: 'support@doctorsim.com',
      website: 'https://doctorsim.com',
      type: 'api',
      status: 'active',
      successRate: 96.2,
      totalOrders: 890,
      priority: 2,
      apiKey: 'demo-api-key-2',
    },
  })

  const supplier3 = await prisma.supplier.upsert({
    where: { id: 'supplier-3' },
    update: {},
    create: {
      id: 'supplier-3',
      name: 'CellUnlocker',
      email: 'support@cellunlocker.com',
      website: 'https://cellunlocker.com',
      type: 'manual',
      status: 'active',
      successRate: 94.8,
      totalOrders: 650,
      priority: 3,
    },
  })

  // Create service categories
  const categoryNames = ['Unlock', 'FRP', 'MDM', 'iCloud', 'Network Unlock', 'Flashing', 'Repair', 'Other']
  const categories: Record<string, string> = {}

  for (const name of categoryNames) {
    const cat = await prisma.serviceCategory.upsert({
      where: { id: `cat-${name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `cat-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name,
      },
    })
    categories[name] = cat.id
  }

  // Create services with custom fields
  const servicesData = [
    {
      id: 'service-1',
      name: 'iPhone Unlock',
      description: 'Unlock any iPhone carrier',
      type: 'unlock',
      cost: 25,
      sellingPrice: 45,
      processingTime: '24-48 hours',
      status: 'active',
      supplierId: supplier1.id,
      categoryId: categories['Unlock'],
      customFields: [
        { fieldType: 'imei_single', label: 'IMEI Number', placeholder: '15-digit IMEI', required: true, visibleToClient: true },
        { fieldType: 'text', label: 'Device Model', placeholder: 'e.g. iPhone 14 Pro Max', required: true, visibleToClient: true },
        { fieldType: 'select', label: 'Carrier', placeholder: '', options: ['AT&T', 'T-Mobile', 'Verizon', 'Vodafone', 'Other'], required: false, visibleToClient: true },
      ],
    },
    {
      id: 'service-2',
      name: 'Samsung FRP Bypass',
      description: 'Remove Google FRP lock',
      type: 'unlock',
      cost: 15,
      sellingPrice: 30,
      processingTime: '1-24 hours',
      status: 'active',
      supplierId: supplier1.id,
      categoryId: categories['FRP'],
      customFields: [
        { fieldType: 'imei_single', label: 'IMEI Number', placeholder: '15-digit IMEI', required: true, visibleToClient: true },
        { fieldType: 'serial_single', label: 'Serial Number', placeholder: 'Device serial number', required: false, visibleToClient: true },
        { fieldType: 'textarea', label: 'Additional Notes', placeholder: 'Any special instructions...', required: false, visibleToClient: true },
      ],
    },
    {
      id: 'service-3',
      name: 'IMEI Check',
      description: 'Check device IMEI status',
      type: 'imei',
      cost: 2,
      sellingPrice: 5,
      processingTime: 'Instant',
      status: 'active',
      supplierId: supplier2.id,
      categoryId: categories['Other'],
      customFields: [
        { fieldType: 'imei_single', label: 'IMEI Number', placeholder: '15-digit IMEI', required: true, visibleToClient: true },
      ],
    },
    {
      id: 'service-4',
      name: 'Android Unlock',
      description: 'Unlock any Android phone',
      type: 'unlock',
      cost: 20,
      sellingPrice: 35,
      processingTime: '24-72 hours',
      status: 'active',
      supplierId: supplier2.id,
      categoryId: categories['Network Unlock'],
      customFields: [
        { fieldType: 'imei_single', label: 'IMEI Number', placeholder: '15-digit IMEI', required: true, visibleToClient: true },
        { fieldType: 'text', label: 'Device Model', placeholder: 'e.g. Samsung Galaxy S24', required: true, visibleToClient: true },
        { fieldType: 'select', label: 'Carrier', placeholder: '', options: ['AT&T', 'T-Mobile', 'Verizon', 'Sprint', 'Other'], required: false, visibleToClient: true },
      ],
    },
    {
      id: 'service-5',
      name: 'iPhone Flash',
      description: 'Flash iPhone firmware',
      type: 'flash',
      cost: 30,
      sellingPrice: 50,
      processingTime: '1-4 hours',
      status: 'active',
      supplierId: supplier3.id,
      categoryId: categories['Flashing'],
      customFields: [
        { fieldType: 'imei_single', label: 'IMEI Number', placeholder: '15-digit IMEI', required: true, visibleToClient: true },
        { fieldType: 'serial_single', label: 'Serial Number', placeholder: 'Device serial number', required: true, visibleToClient: true },
        { fieldType: 'image', label: 'Device Photo', placeholder: '', required: false, visibleToClient: true },
        { fieldType: 'textarea', label: 'Additional Notes', placeholder: 'Firmware version, issues, etc.', required: false, visibleToClient: true },
      ],
    },
    {
      id: 'service-6',
      name: 'Huawei Unlock',
      description: 'Unlock Huawei carrier lock',
      type: 'unlock',
      cost: 18,
      sellingPrice: 32,
      processingTime: '24-48 hours',
      status: 'active',
      supplierId: supplier1.id,
      categoryId: categories['Network Unlock'],
      customFields: [
        { fieldType: 'imei_single', label: 'IMEI Number', placeholder: '15-digit IMEI', required: true, visibleToClient: true },
        { fieldType: 'text', label: 'Device Model', placeholder: 'e.g. Huawei P60 Pro', required: true, visibleToClient: true },
      ],
    },
    {
      id: 'service-7',
      name: 'Tecno MDM Remove',
      description: 'Remove MDM lock from Tecno devices',
      type: 'unlock',
      cost: 12,
      sellingPrice: 25,
      processingTime: '1-6 hours',
      status: 'active',
      supplierId: supplier1.id,
      categoryId: categories['MDM'],
      customFields: [
        { fieldType: 'imei_multi', label: 'IMEI Numbers', placeholder: 'One IMEI per line', required: true, visibleToClient: true },
        { fieldType: 'serial_single', label: 'Serial Number', placeholder: 'Device serial number', required: false, visibleToClient: true },
        { fieldType: 'image', label: 'Purchase Invoice', placeholder: '', required: false, visibleToClient: true },
        { fieldType: 'textarea', label: 'Additional Notes', placeholder: 'Any special instructions...', required: false, visibleToClient: true },
      ],
    },
    {
      id: 'service-8',
      name: 'iCloud Activation Lock',
      description: 'Remove iCloud activation lock',
      type: 'unlock',
      cost: 35,
      sellingPrice: 60,
      processingTime: '24-72 hours',
      status: 'active',
      supplierId: supplier2.id,
      categoryId: categories['iCloud'],
      customFields: [
        { fieldType: 'serial_single', label: 'Serial Number', placeholder: 'Device serial number', required: true, visibleToClient: true },
        { fieldType: 'image', label: 'Proof of Purchase', placeholder: '', required: true, visibleToClient: true },
      ],
    },
  ]

  for (const serviceData of servicesData) {
    const { customFields, ...serviceInfo } = serviceData
    const service = await prisma.service.upsert({
      where: { id: serviceInfo.id },
      update: {},
      create: serviceInfo,
    })

    // Create custom fields
    for (let i = 0; i < customFields.length; i++) {
      const cf = customFields[i]
      await prisma.serviceCustomField.create({
        data: {
          serviceId: service.id,
          fieldType: cf.fieldType,
          label: cf.label,
          placeholder: cf.placeholder || null,
          options: cf.options ? JSON.stringify(cf.options) : null,
          required: cf.required,
          visibleToClient: cf.visibleToClient,
          order: i,
        },
      })
    }
  }

  // Create sample orders
  const orders = [
    {
      id: 'order-1',
      orderNumber: 'ORD-2024-001',
      userId: reseller.id,
      serviceId: 'service-1',
      supplierId: supplier1.id,
      imei: '359123456789012',
      deviceInfo: 'iPhone 14 Pro Max',
      status: 'completed',
      cost: 25,
      sellingPrice: 45,
      profit: 20,
      completedAt: new Date(),
    },
    {
      id: 'order-2',
      orderNumber: 'ORD-2024-002',
      userId: reseller.id,
      serviceId: 'service-2',
      supplierId: supplier1.id,
      imei: '359123456789013',
      deviceInfo: 'Samsung Galaxy S23',
      status: 'processing',
      cost: 15,
      sellingPrice: 30,
      profit: 15,
    },
    {
      id: 'order-3',
      orderNumber: 'ORD-2024-003',
      userId: reseller.id,
      serviceId: 'service-3',
      supplierId: supplier2.id,
      imei: '359123456789014',
      deviceInfo: 'iPhone 13',
      status: 'completed',
      cost: 2,
      sellingPrice: 5,
      profit: 3,
      completedAt: new Date(),
    },
  ]

  for (const order of orders) {
    await prisma.order.upsert({
      where: { id: order.id },
      update: {},
      create: order as any,
    })
  }

  // Create transactions
  const transactions = [
    {
      id: 'tx-1',
      userId: reseller.id,
      type: 'deposit',
      amount: 5000,
      balanceAfter: 5000,
      description: 'Initial deposit',
    },
    {
      id: 'tx-2',
      userId: reseller.id,
      orderId: 'order-1',
      type: 'order_payment',
      amount: -25,
      balanceAfter: 4975,
      description: 'Payment for iPhone Unlock',
    },
    {
      id: 'tx-3',
      userId: reseller.id,
      type: 'deposit',
      amount: 500,
      balanceAfter: 4500,
      description: 'Additional deposit',
    },
  ]

  for (const tx of transactions) {
    await prisma.transaction.upsert({
      where: { id: tx.id },
      update: {},
      create: tx as any,
    })
  }

  console.log('Database seeded successfully!')
  console.log('Users created:')
  console.log('  Admin: admin@smartbdunlock.com / admin123')
  console.log('  Reseller: reseller@smartbdunlock.com / reseller123')
  console.log(`Categories: ${categoryNames.join(', ')}`)
  console.log(`Services: ${servicesData.map(s => s.name).join(', ')}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
