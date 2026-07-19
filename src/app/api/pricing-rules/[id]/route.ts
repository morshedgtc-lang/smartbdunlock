import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()
    const { id } = await params
    const rule = await prisma.pricingRule.findUnique({
      where: { id },
      include: { provider: { select: { id: true, name: true } } },
    })
    if (!rule) return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    return NextResponse.json(rule)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    return NextResponse.json({ error: 'Failed to fetch rule' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const body = await request.json()

    const data: Record<string, unknown> = {}
    for (const field of ['value', 'category', 'providerId', 'currency', 'active']) {
      if (field in body) data[field] = body[field]
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
    }

    const rule = await prisma.pricingRule.update({ where: { id }, data })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'pricing_rule.update',
      entityType: 'pricing_rule',
      entityId: id,
      newValues: data,
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json(rule)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    await prisma.pricingRule.delete({ where: { id } })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'pricing_rule.delete',
      entityType: 'pricing_rule',
      entityId: id,
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({ message: 'Rule deleted' })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 })
  }
}
