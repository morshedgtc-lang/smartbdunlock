import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { pollPendingJobs } from '@/lib/suppliers'

export async function POST() {
  try {
    await requireAdmin()
    const results = await pollPendingJobs()
    return NextResponse.json(results)
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('Supplier poll error:', error)
    return NextResponse.json({ error: 'Poll failed' }, { status: 500 })
  }
}
