import { authenticateApiKey } from '@/lib/api-key-auth'
import { okResponse, errorResponse } from '@/lib/api-response'
import { sendWebhookTest } from '@/lib/webhooks'
import { withApiLogging } from '@/lib/api-request'

export async function POST(request: Request) {
  const log = withApiLogging(request, {})
  try {
    const auth = await authenticateApiKey(request)
    if ('error' in auth) return log.finish(auth.error, { errorCode: 'AUTH_FAILED' })

    if (auth.user.permissions !== 'write' && auth.user.permissions !== 'admin') {
      return log.finish(errorResponse('Write permission required', 'FORBIDDEN', 403), { errorCode: 'FORBIDDEN' })
    }

    const result = await sendWebhookTest(auth.user.userId)
    if (!result.ok) {
      return log.finish(errorResponse('Webhook is not configured', 'WEBHOOK_NOT_CONFIGURED', 400), { errorCode: 'WEBHOOK_NOT_CONFIGURED' })
    }

    return log.finish(okResponse({ test: result.delivery }))
  } catch (error) {
    console.error('v1 Webhook test error:', error)
    return log.finish(errorResponse('Failed to send test webhook', 'INTERNAL_ERROR', 500), { errorCode: 'INTERNAL_ERROR' })
  }
}