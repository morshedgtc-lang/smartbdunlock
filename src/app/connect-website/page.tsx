import Link from 'next/link'

const steps = [
  {
    n: '1',
    title: 'Get your API key',
    body: 'Your key is issued by the platform admin. In most cases it looks like A1B2-C3D4-E5F6-G7H8-J9K2-L3M4-N5P6-Q7R8. Every request is authenticated with it.',
  },
  {
    n: '2',
    title: 'Send it on every request',
    body: 'Attach the key as a Bearer token. Call the service catalog to find service IDs and your exact reseller pricing.',
  },
  {
    n: '3',
    title: 'Create orders idempotently',
    body: 'Every order has an external_id. Re-sending the same external_id never double-charges — you get the existing order back.',
  },
  {
    n: '4',
    title: 'Listen for updates via webhook',
    body: 'Point a webhook endpoint at your site to receive signed JSON on order.completed, order.failed, etc. Always verify the HMAC signature.',
  },
]

const base = 'https://www.smartbdunlock.com/api/v1'

export default function ConnectWebsitePage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--foreground)]">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-[var(--accent)] hover:underline">
          ← Back to home
        </Link>

        <h1 className="text-3xl font-bold mt-6 mb-2">Connect your website</h1>
        <p className="text-[var(--muted)] leading-relaxed mb-10">
          Integrate order placement and status tracking into your own site in a few minutes. No SDK required — plain HTTPS + a bearer token.
        </p>

        <div className="space-y-6">
          {steps.map((s) => (
            <div key={s.n} className="flex gap-4">
              <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/30 flex items-center justify-center font-bold text-sm">
                {s.n}
              </div>
              <div>
                <h2 className="font-semibold mb-1">{s.title}</h2>
                <p className="text-sm text-[var(--muted)] leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold mt-12 mb-3">Quick start</h2>

        <div className="mb-6">
          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">List services & see your prices</p>
          <pre className="text-xs bg-white/5 rounded-xl p-4 overflow-x-auto">{`curl -H "Authorization: Bearer $YOUR_API_KEY" "${base}/services?limit=50"`}</pre>
        </div>

        <div className="mb-6">
          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Create an order (idempotent)</p>
          <pre className="text-xs bg-white/5 rounded-xl p-4 overflow-x-auto">{`curl -X POST "${base}/orders" \\
  -H "Authorization: Bearer $YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"external_id":"order-001","service_id":"clx...","imei":"351234567890123"}'`}</pre>
        </div>

        <div className="mb-6">
          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Track status</p>
          <pre className="text-xs bg-white/5 rounded-xl p-4 overflow-x-auto">{`curl -H "Authorization: Bearer $YOUR_API_KEY" "${base}/orders/order-001"`}</pre>
        </div>

        <h2 className="text-xl font-bold mt-12 mb-3">Receive status updates (webhook)</h2>
        <p className="text-sm text-[var(--muted)] mb-4">
          Every delivery is signed with <code>X-Webhook-Signature</code> = HMAC-SHA256 of{' '}
          <code>&quot;&#123;timestamp&#125;.&#123;rawBody&#125;&quot;</code> using your signing secret. Always verify it.
        </p>

        <div className="mb-6">
          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Node.js signature check</p>
          <pre className="text-xs bg-white/5 rounded-xl p-4 overflow-x-auto">{`const crypto = require('crypto')
const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET)
  .update(\`\${req.headers['x-webhook-timestamp']}.\${rawBody}\`)
  .digest('hex')
if (!crypto.timingSafeEqual(Buffer.from(hmac, 'hex'),
    Buffer.from(req.headers['x-webhook-signature'], 'hex'))) {
  return res.status(401).end()
}`}</pre>
        </div>

        <div className="mb-6">
          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">PHP signature check</p>
          <pre className="text-xs bg-white/5 rounded-xl p-4 overflow-x-auto">{`$expected = hash_hmac('sha256', $timestamp . '.' . $rawBody, $WEBHOOK_SECRET);
if (!hash_equals($expected, $signature)) { http_response_code(401); exit; }`}</pre>
        </div>

        <h2 className="text-xl font-bold mt-12 mb-3">Error codes</h2>
        <div className="table-responsive">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)]">
                <th className="text-left py-2 pr-4 text-[var(--muted)] font-medium">HTTP</th>
                <th className="text-left py-2 text-[var(--muted)] font-medium">Code</th>
                <th className="text-left py-2 text-[var(--muted)] font-medium">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['400', 'validation_error', 'Missing or malformed fields'],
                ['401', 'unauthorized', 'Missing, invalid, or expired API key'],
                ['403', 'forbidden', 'Key valid but account suspended / permission denied'],
                ['403', 'service_not_available', 'Service not purchasable for your account'],
                ['404', 'not_found', 'Order or service not found'],
                ['409', 'insufficient_balance', 'Wallet balance below order price'],
                ['429', 'rate_limited', 'Request limit exceeded this minute — retry shortly'],
                ['500', 'internal_error', 'Server error — retry with the same external_id (safe)'],
              ].map(([code, name, meaning]) => (
                <tr key={name} className="border-b border-[var(--card-border)]">
                  <td className="py-2 pr-4 font-mono text-xs text-[var(--accent)]">{code}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{name}</td>
                  <td className="py-2 text-xs text-[var(--muted)]">{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-sm text-[var(--muted)] mt-10">
          Full reference: <Link href="/reseller/api-docs" className="text-[var(--accent)] hover:underline">API docs</Link> (sign in required).
        </p>
      </div>
    </div>
  )
}