import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { approveServiceSchema, validateBody } from '@/lib/validations'
import { calculateSellingPrice } from '@/lib/suppliers/sync-engine'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const body = await request.json()
    const validation = validateBody(approveServiceSchema, { ...body, id })
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { sellingPrice, profitType, profitValue, categoryId, clientVisible } = validation.data

    const supplierService = await prisma.supplierService.findUnique({
      where: { id },
      include: { provider: true },
    })
    if (!supplierService) return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    if (supplierService.status === 'approved' && supplierService.websiteServiceId) {
      return NextResponse.json({ error: 'Service is already approved' }, { status: 400 })
    }

    const calculatedPrice = sellingPrice || await calculateSellingPrice({
      supplierCost: supplierService.supplierCost,
      providerId: supplierService.providerId,
      category: supplierService.category || undefined,
      serviceOverride: profitValue > 0 ? { profitType, profitValue } : undefined,
    })

    const websiteService = await prisma.service.create({
      data: {
        name: supplierService.name,
        description: `Imported from ${supplierService.provider.name}`,
        type: 'unlock',
        cost: supplierService.supplierCost,
        sellingPrice: calculatedPrice,
        processingTime: supplierService.deliveryTime || undefined,
        status: 'active',
        clientVisible: clientVisible ?? true,
        categoryId: categoryId || undefined,
        supplierId: supplierService.providerId,
        supplierServiceId: supplierService.id,
        profitType,
        profitValue,
      },
    })

    await prisma.supplierService.update({
      where: { id },
      data: { status: 'approved', websiteServiceId: websiteService.id },
    })

    if (supplierService.requiredInputs) {
      const fields = JSON.parse(supplierService.requiredInputs) as string[]
      const fieldTypes: Record<string, string> = {
        imei: 'imei_single', email: 'text', username: 'text', password: 'text',
        serial: 'serial_single', screenshot: 'file', model: 'text', brand: 'text',
      }

      await prisma.serviceCustomField.createMany({
        data: fields.map((f, i) => ({
          serviceId: websiteService.id,
          fieldType: fieldTypes[f.toLowerCase()] || 'text',
          label: f.charAt(0).toUpperCase() + f.slice(1).replace(/_/g, ' '),
          required: ['imei', 'serial'].includes(f.toLowerCase()),
          visibleToClient: true,
          previewImage: false,
          order: i,
        })),
      })
    }

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'supplier_service.approve',
      entityType: 'supplier_service',
      entityId: id,
      newValues: { websiteServiceId: websiteService.id, sellingPrice: calculatedPrice },
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({ message: 'Service approved and published', websiteServiceId: websiteService.id, sellingPrice: calculatedPrice })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Approve service error:', error)
    return NextResponse.json({ error: 'Failed to approve service' }, { status: 500 })
  }
}
