import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { pricingRuleQuerySchema, createPricingRuleSchema, validateBody, validateQuery } from '@/lib/validations'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'

export async function GET(request: Request) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const validation = validateQuery(pricingRuleQuerySchema, searchParams)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { type, category, providerId, active } = validation.data

    const where: Record<string, unknown> = {}
    if (type) where.type = type
    if (category) where.category = category
    if (providerId) where.providerId = providerId
    if (active !== undefined) where.active = active

    const rules = await prisma.pricingRule.findMany({
      where,
      include: { provider: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ rules })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    console.error('Pricing rules GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch pricing rules' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const validation = validateBody(createPricingRuleSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const rule = await prisma.pricingRule.create({ data: validation.data })

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'pricing_rule.create',
      entityType: 'pricing_rule',
      entityId: rule.id,
      newValues: validation.data,
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json(rule, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Pricing rules POST error:', error)
    return NextResponse.json({ error: 'Failed to create pricing rule' }, { status: 500 })
  }
}
