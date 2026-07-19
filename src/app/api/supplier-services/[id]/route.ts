import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()
    const { id } = await params

    const service = await prisma.supplierService.findUnique({
      where: { id },
      include: { provider: { select: { id: true, name: true } } },
    })

    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    return NextResponse.json(service)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    return NextResponse.json({ error: 'Failed to fetch service' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const body = await request.json()

    const data: Record<string, unknown> = {}
    for (const field of ['status', 'category', 'supplierCost']) {
      if (field in body) data[field] = body[field]
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
    }

    const service = await prisma.supplierService.update({ where: { id }, data })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'supplier_service.update',
      entityType: 'supplier_service',
      entityId: id,
      newValues: data,
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json(service)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    const service = await prisma.supplierService.findUnique({ where: { id }, include: { websiteService: true } })
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    if (service.websiteService) {
      return NextResponse.json({ error: 'Cannot delete an approved service with a published website service. Disable it instead.' }, { status: 400 })
    }

    await prisma.supplierService.delete({ where: { id } })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'supplier_service.delete',
      entityType: 'supplier_service',
      entityId: id,
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({ message: 'Service deleted' })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 })
  }
}
