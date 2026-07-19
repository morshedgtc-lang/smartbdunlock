import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { calculateSellingPrice } from '@/lib/suppliers/sync-engine'

export async function POST(request: Request) {
  try {
    await requireAuth()
    const body = await request.json()
    const { supplierCost, providerId, category, profitType, profitValue } = body

    if (typeof supplierCost !== 'number' || supplierCost < 0) {
      return NextResponse.json({ error: 'Invalid supplier cost' }, { status: 400 })
    }

    const price = await calculateSellingPrice({
      supplierCost,
      providerId,
      category,
      serviceOverride: profitValue > 0 ? { profitType: profitType || 'fixed', profitValue } : undefined,
    })

    return NextResponse.json({ supplierCost, sellingPrice: price, profit: Math.round((price - supplierCost) * 100) / 100 })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 })
    return NextResponse.json({ error: 'Failed to calculate price' }, { status: 500 })
  }
}
