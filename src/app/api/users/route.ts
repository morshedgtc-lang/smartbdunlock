import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/auth'
import { usersQuerySchema, createUserSchema, updateUserSchema, validateBody, validateQuery } from '@/lib/validations'
import { auditLog, getClientIp, getClientUserAgent } from '@/lib/audit'
import bcrypt from 'bcryptjs'

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const validation = validateQuery(usersQuerySchema, searchParams)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { search, role, limit } = validation.data

    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (role) where.role = role

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true, email: true, name: true, role: true, phone: true,
        status: true, walletBalance: true, resellerId: true, createdAt: true,
        _count: { select: { orders: true, transactions: true } },
      },
    })

    return NextResponse.json({
      users: users.map(u => ({
        ...u,
        orderCount: u._count.orders,
        transactionCount: u._count.transactions,
      })),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Users GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    const validation = validateBody(createUserSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { email, password, name, phone, role, resellerId } = validation.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 409 })

    const hashedPassword = await bcrypt.hash(password, 12)
    const admin = await requireAuth()
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone: phone || null,
        role: role || 'reseller',
        resellerId: resellerId || null,
      },
      select: {
        id: true, email: true, name: true, role: true, status: true,
        walletBalance: true, resellerId: true,
      },
    })

    await auditLog({
      userId: admin.id,
      userEmail: admin.email,
      action: 'user.create',
      entityType: 'user',
      entityId: user.id,
      newValues: { email, name, role: user.role },
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Users POST error:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    const validation = validateBody(updateUserSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { id, password, ...updates } = validation.data

    const data: Record<string, unknown> = {}
    for (const field of ['name', 'phone', 'role', 'status', 'resellerId']) {
      if (field in updates) data[field] = (updates as Record<string, unknown>)[field]
    }
    if (password) {
      data.password = await bcrypt.hash(password, 12)
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const admin = await requireAuth()
    const before = await prisma.user.findUnique({ where: { id }, select: { name: true, role: true, status: true, phone: true } })
    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, email: true, name: true, role: true, phone: true,
        status: true, walletBalance: true, resellerId: true,
      },
    })

    await auditLog({
      userId: admin.id,
      userEmail: admin.email,
      action: 'user.update',
      entityType: 'user',
      entityId: id,
      oldValues: before || {},
      newValues: data,
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json(user)
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Users PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id') || ''

    const body = await request.json().catch(() => ({}))
    const userId = id || (body as any).id || ''

    if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 })

    const admin = await requireAuth()
    if (userId === admin.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    const deleted = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true, role: true } })
    await prisma.user.delete({ where: { id: userId } })

    await auditLog({
      userId: admin.id,
      userEmail: admin.email,
      action: 'user.delete',
      entityType: 'user',
      entityId: userId,
      oldValues: deleted || {},
      ip: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Users DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
