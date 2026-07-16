import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const user = await getSession()
    if (!user || !user.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    let lastCheck = new Date()

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()

        const poll = async () => {
          try {
            const now = new Date()
            const [notifications, unreadCount] = await Promise.all([
              prisma.notification.findMany({
                where: {
                  userId: user.id,
                  read: false,
                  createdAt: { gt: lastCheck },
                },
                orderBy: { createdAt: 'desc' },
                take: 50,
              }),
              prisma.notification.count({
                where: { userId: user.id, read: false },
              }),
            ])

            if (notifications.length > 0) {
              const data = JSON.stringify({ notifications, unreadCount })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }

            lastCheck = now
          } catch {
            // polling errors are silently retried on next tick
          }
        }

        // Poll immediately, then every 5 seconds
        poll()
        const interval = setInterval(poll, 5000)

        request.signal.addEventListener('abort', () => {
          clearInterval(interval)
          controller.close()
        })
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch {
    return new Response('Unauthorized', { status: 401 })
  }
}
