import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { logsQuerySchema, createLogSchema, validateBody, validateQuery } from '@/lib/validations'

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const validation = validateQuery(logsQuerySchema, searchParams)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { level, source, limit } = validation.data

    const where: any = {}
    if (level) where.level = level
    if (source) where.source = source

    const logs = await prisma.log.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        level: true,
        message: true,
        source: true,
        details: true,
        ip: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ logs })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Logs GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    const validation = validateBody(createLogSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { level, message, source, details } = validation.data

    const log = await prisma.log.create({
      data: {
        level: level || 'info',
        message,
        source: source || 'manual',
        details: details ? JSON.stringify(details) : null,
      },
    })

    return NextResponse.json(log, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Logs POST error:', error)
    return NextResponse.json({ error: 'Failed to create log' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Log ID is required' }, { status: 400 })
    }

    await prisma.log.delete({ where: { id } })

    return NextResponse.json({ message: 'Log deleted' })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    if (error.message === 'Forbidden') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Logs DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete logs' }, { status: 500 })
  }
}
