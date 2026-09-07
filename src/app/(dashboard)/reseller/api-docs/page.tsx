'use client'

import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { useState } from 'react'

const BASE = 'https://www.smartbdunlock.com/api/v1'

function CodeBlock({ title, code }: { title: string; code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="rounded-xl overflow-hidden bg-white/5 border border-[var(--card-border)]">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-[var(--card-border)]">
        <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">{title}</p>
        <button className="text-xs text-[var(--accent)] hover:underline cursor-pointer" onClick={copy}>{copied ? 'Copied!' : 'Copy'}</button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs text-[var(--foreground)] leading-relaxed"><code>{code}</code></pre>
    </div>
  )
}

const curlCreate = `curl -X POST ${BASE}/orders \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "external_id": "your-unique-id-123",
    "service_id": "clx123...",
    "imei": "351234567890123",
    "device_info": "iPhone 14 Pro Max",
    "custom_values": { "network": "AT&T" }
  }'`

const curlList = `curl -X GET "${BASE}/orders?status=processing&page=1&limit=20" \\
  -H "Authorization: Bearer YOUR_API_KEY"`

const curlServices = `curl -X GET "${BASE}/services?search=unlock&type=carrier&limit=50" \\
  -H "Authorization: Bearer YOUR_API_KEY"`

const curlBalance = `curl -X GET ${BASE}/balance \\
  -H "Authorization: Bearer YOUR_API_KEY"`

const jsClient = `const API_URL = '${BASE}'
const API_KEY = 'YOUR_API_KEY'

async function createOrder(externalId, serviceId, imei) {
  const res = await fetch(\`\${API_URL}/orders\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ external_id: externalId, service_id: serviceId, imei }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message)
  return json.data
}

// Idempotent: calling with the same external_id twice returns the same order.
const order = await createOrder('order-001', 'svc-123', '351234567890123')
console.log(order.status)` 

const phpClient = `<?php
\$curl = curl_init('${BASE}/orders');
curl_setopt_array(\$curl, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => [
    'Authorization: Bearer ' . \$API_KEY,
    'Content-Type: application/json',
  ],
  CURLOPT_POSTFIELDS => json_encode([
    'external_id' => 'order-001',
    'service_id' => 'svc-123',
    'imei' => '351234567890123',
  ]),
]);
\$response = json_decode(curl_exec(\$curl), true);
if (\$response['success']) {
  echo \$response['data']['status']; // processing
}` 

const verifyNode = `const crypto = require('crypto')

// Headers sent with every webhook:
//  X-Webhook-Signature, X-Webhook-Timestamp, X-Webhook-Event,
//  X-Webhook-Delivery, X-Request-ID

function verify(rawBody, signature, timestamp, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(\`\${timestamp}.\${rawBody}\`)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signature, 'hex')
  )
}

// In your webhook handler:
if (!verify(req.rawBody, req.headers['x-webhook-signature'],
             req.headers['x-webhook-timestamp'], WEBHOOK_SECRET)) {
  return res.status(401).end() // do NOT process
}
console.log(req.headers['x-webhook-event'], req.body)`

const verifyPhp = `<?php
\$signature = \$_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '';
\$timestamp = \$_SERVER['HTTP_X_WEBHOOK_TIMESTAMP'] ?? '';
\$rawBody   = file_get_contents('php://input');
\$expected  = hash_hmac('sha256', \$timestamp . '.' . \$rawBody, \$WEBHOOK_SECRET);
if (!hash_equals(\$expected, \$signature)) {
  http_response_code(401); exit; // do NOT process
}`

const eventsTable = [
  ['order.created', 'Order placed and debited from your wallet'],
  ['order.processing', 'Order accepted and sent to the unlock network'],
  ['order.completed', 'Order finished — result/verification included'],
  ['order.failed', 'Order could not be completed'],
  ['order.cancelled', 'Order cancelled by you or the provider'],
  ['order.rejected', 'Order rejected by the provider'],
  ['order.refunded', 'Amount refunded back to your wallet'],
  ['order.replied', 'Provider replied with notes/update'],
  ['test.ping', 'Test event sent when the admin validates your endpoint'],
]

const errorsTable = [
  ['400', 'invalid_request', 'Malformed body or missing required fields'],
  ['401', 'unauthorized', 'Missing, invalid, or expired API key'],
  ['403', 'forbidden', 'Key active but account suspended or permission denied'],
  ['404', 'not_found', 'Resource not found (order, service…)'],
  ['409', 'insufficient_balance', 'Wallet balance is lower than the order price in this transaction'],
  ['409', 'already_exists', 'Order with the same external_id already processed (different record)'],
  ['422', 'validation_error', 'Field-level validation failed (see details)'],
  ['429', 'rate_limited', 'Per-key request limit exceeded — retry after the window (1 minute)'],
  ['500', 'internal_error', 'Server error — retry with the same external_id (idempotent)'],
]

export default function ApiDocsPage() {
  return (
    <div>
      <Header title="API Documentation" subtitle="Versioned reseller API for creating and tracking orders" />
      <div className="p-6 space-y-6">
        <GlassCard>
          <h3 className="font-semibold text-[var(--foreground)] mb-3">Overview</h3>
          <div className="space-y-2 text-sm text-[var(--muted)] leading-relaxed">
            <p>
              The API lets you create orders, query order status, list services, and fetch your wallet balance programmatically.
              Every request must be authenticated with your API key sent as a <code className="bg-white/5 px-1.5 py-0.5 rounded">Authorization: Bearer &lt;KEY&gt;</code> header.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Base URL: <code className="bg-white/5 px-1.5 py-0.5 rounded">{BASE}</code></li>
              <li>Orders are <strong className="text-[var(--foreground)]">idempotent</strong> by <code className="bg-white/5 px-1.5 py-0.5 rounded">external_id</code> — retries are safe and never double-charged.</li>
              <li>Rate limit: key limit per <strong className="text-[var(--foreground)]">minute</strong> (HTTP 429 when exceeded).</li>
              <li>All error responses share one shape: <code className="bg-white/5 px-1.5 py-0.5 rounded">{'{ success: false, error: { code, message } }'}</code></li>
              <li>Order status changes are pushed to your webhook endpoint (HMAC-signed).</li>
            </ul>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="font-semibold text-[var(--foreground)] mb-3">Create Order</h3>
          <p className="text-sm text-[var(--muted)] mb-3">
            <code className="bg-white/5 px-1.5 py-0.5 rounded">POST /orders</code> — replaces your wallet balance
            with the order amount atomically and creates the order. Reusing the same <code className="bg-white/5 px-1.5 py-0.5 rounded">external_id</code> returns the existing
            order with <code className="bg-white/5 px-1.5 py-0.5 rounded">{"idempotent_replay: true"}</code>.
          </p>
          <CodeBlock title="cURL" code={curlCreate} />
          <CodeBlock title="JavaScript (Node/Deno/Browser)" code={jsClient} />
          <CodeBlock title="PHP" code={phpClient} />
        </GlassCard>

        <GlassCard>
          <h3 className="font-semibold text-[var(--foreground)] mb-3">Other Endpoints</h3>
          <div className="space-y-3">
            <CodeBlock title="List services (with your effective prices)" code={curlServices} />
            <CodeBlock title="List your orders (status filter + pagination)" code={curlList} />
            <CodeBlock title="Wallet balance & recent transactions" code={curlBalance} />
            <div className="text-sm text-[var(--muted)]">
              <p><code className="bg-white/5 px-1.5 py-0.5 rounded">GET /orders/&lt;reference&gt;</code> — fetch a single order by external_id, internal order id, or order number.</p>
              <p className="mt-1"><code className="bg-white/5 px-1.5 py-0.5 rounded">GET /account</code> — your account profile and key summary.</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="font-semibold text-[var(--foreground)] mb-3">Webhook Delivery & Signature Verification</h3>
          <p className="text-sm text-[var(--muted)] mb-3 leading-relaxed">
            Every subscribed event is delivered to your endpoint with <code className="bg-white/5 px-1.5 py-0.5 rounded">X-Webhook-Signature</code> =
            HMAC-SHA256 (hex) of <code className="bg-white/5 px-1.5 py-0.5 rounded">{`timestamp + "." + rawBody`}</code> using your signing secret.
            Deliveries retry with exponential backoff (up to 8 attempts, ~1h max gap). Always respond <code className="bg-white/5 px-1.5 py-0.5 rounded">2xx</code> as fast as possible.
          </p>
          <CodeBlock title="Verify signature — JavaScript" code={verifyNode} />
          <CodeBlock title="Verify signature — PHP" code={verifyPhp} />
          <div className="mt-3 table-responsive">
            <table className="w-full text-sm min-w-[420px]">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="text-left py-2 px-3 text-[var(--muted)] font-medium">Event</th>
                  <th className="text-left py-2 px-3 text-[var(--muted)] font-medium">Meaning</th>
                </tr>
              </thead>
              <tbody>
                {eventsTable.map(([event, meaning]) => (
                  <tr key={event} className="border-b border-[var(--card-border)]">
                    <td className="py-2 px-3"><code className="text-xs">{event}</code></td>
                    <td className="py-2 px-3 text-xs text-[var(--muted)]">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="font-semibold text-[var(--foreground)] mb-3">Errors</h3>
          <div className="table-responsive">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="text-left py-2 px-3 text-[var(--muted)] font-medium">HTTP</th>
                  <th className="text-left py-2 px-3 text-[var(--muted)] font-medium">Code</th>
                  <th className="text-left py-2 px-3 text-[var(--muted)] font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {errorsTable.map(([code, errCode, desc]) => (
                  <tr key={errCode} className="border-b border-[var(--card-border)]">
                    <td className="py-2 px-3"><span className="text-xs font-mono px-2 py-0.5 rounded-lg bg-red-500/10 text-red-500">{code}</span></td>
                    <td className="py-2 px-3"><code className="text-xs">{errCode}</code></td>
                    <td className="py-2 px-3 text-xs text-[var(--muted)]">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="font-semibold text-[var(--foreground)] mb-3">Order Object</h3>
          <CodeBlock title="Create / list response (data)" code={`{
  "success": true,
  "data": {
    "id": "ORD-1725...",        // external_id if you provided one, else internal id
    "orderId": "clx...",        // internal order id
    "orderNumber": "ORD-1725",  // human-friendly
    "externalId": "your-unique-id-123",
    "status": "processing",     // pending|processing|completed|failed|cancelled|rejected|refunded
    "serviceName": "iPhone Carrier Unlock",
    "serviceType": "unlock",
    "imei": "351234567890123",
    "deviceInfo": "iPhone 14 Pro Max",
    "notes": null,
    "result": null,             // verification result on completion
    "customValues": { "network": "AT&T" },
    "sellingPrice": 12.50,
    "createdAt": "2026-09-07T10:15:00.000Z",
    "updatedAt": "2026-09-07T10:15:03.000Z"
  }
}`} />
        </GlassCard>

        <div className="flex justify-end pb-8">
          <GlassButton variant="secondary" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Back to top
          </GlassButton>
        </div>
      </div>
    </div>
  )
}