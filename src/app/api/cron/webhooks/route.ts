import { NextResponse } from 'next/server'
import { retryDueDeliveries } from '@/lib/webhooks'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const retried = await retryDueDeliveries(50)
    return NextResponse.json({ retried })
  } catch (error: unknown) {
    console.error('Cron webhooks error:', error)
    return NextResponse.json({ error: 'Failed to retry webhooks' }, { status: 500 })
  }
}