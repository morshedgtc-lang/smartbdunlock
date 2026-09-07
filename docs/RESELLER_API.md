# Reseller API Reference

Base URL: `https://www.smartbdunlock.com/api/v1`

The Reseller API lets you create orders, track status, list services, and read your balance programmatically. All requests are authenticated with an API key issued by the platform admin.

## Authentication

Send your key as a Bearer token on every request:

```
Authorization: Bearer ABCD-EFGH-JKLM-NPQR-STUV-WXYZ-2345-6789
```

Key format: 8 groups of 3 characters, alphabet `A-Z` + `2-9`, excluding `0,O,1,I` to avoid typo confusion. Only the key owner can see the full key — it is stored encrypted and shown once on creation. It can be re-revealed or rotated at any time from the **API Settings** page (dashboard → reseller → API Settings).

Key features:

- **Idempotent orders** — every order carries a unique `external_id`. Retrying the same `external_id` never double-charges; the existing order is returned with `"idempotent_replay": true`.
- **Rate limiting** — per-key request limit applies per minute. The current window counter resets automatically. Exceeding it returns `429 rate_limited`.
- **Account status** — orders cannot be placed while the account is suspended (`403 forbidden`).
- **Deterministic pricing** — the price you see in `GET /services` is the price you are charged. If the admin configured per-reseller overrides, only enabled overrides are purchasable.
- **Key management** — a key can be surfaced (revealed) or invalidated and replaced (rotated) self-service. Key status is admin-controlled.
- **Self-service webhooks** — manage your endpoint URL, subscribed events, signing secret, and test pings from the API Settings page without contacting admin.

## Envelope

Success:

```json
{ "success": true, "data": { ... }, "meta": { ... } }
```

Error:

```json
{ "success": false, "error": { "code": "validation_error", "message": "..." } }
```

## Endpoints

### Create Order

`POST /orders`

```json
{
  "external_id": "your-unique-id-123",      // required; idempotency key scoped to your account
  "service_id": "clx...",                    // required
  "imei": "351234567890123",
  "device_info": "iPhone 14 Pro Max",
  "notes": "optional note",
  "custom_values": { "<customFieldId>": "value" }
}
```

A `$transaction` atomically checks your balance, debits the order price, records the wallet transaction, and creates the order. On success the order is submitted to the unlock network and a `order.created` webhook is queued.

Response (`200` new / `200` with `"idempotent_replay": true` when `external_id` was already used):

```json
{ "success": true, "data": { "id": "...", "status": "processing", ... } }
```

### Fetch Order

`GET /orders/:reference` — lookup by `external_id`, internal order id, or order number.

### List Orders

`GET /orders?status=processing&page=1&limit=20` — optional `status` filter; results newest first.

### List Services

`GET /services?search=unlock&type=carrier&limit=50` — returns purchasable services with **your** effective price and the custom fields the admin wants you to provide.

### Balance

`GET /balance` — current balance plus the last 25 wallet transactions.

### Account

`GET /account` — account profile and key summary.

## Order object

| Field             | Notes                                                        |
| ----------------- | ------------------------------------------------------------ |
| `id`              | `external_id` if you supplied one, else the internal order id |
| `orderId`         | internal order id                                            |
| `orderNumber`     | human-friendly number                                        |
| `externalId`      | your idempotency key                                         |
| `status`          | `pending` `processing` `completed` `failed` `cancelled` `rejected` `refunded` |
| `serviceName/Type`| service metadata                                             |
| `customValues`    | public custom field values                                   |
| `sellingPrice`    | what your wallet was debited                                 |
| `result`          | verification result when completed                           |

## Webhooks

## Signing

Every delivery includes headers:

| Header                | Value                                                        |
| --------------------- | ------------------------------------------------------------ |
| `X-Webhook-Signature` | Hex HMAC-SHA256 of `${timestamp}.${rawBody}` with your secret |
| `X-Webhook-Timestamp` | Unix seconds                                                 |
| `X-Webhook-Event`     | e.g. `order.completed`                                       |
| `X-Webhook-Delivery`  | unique delivery id                                            |
| `X-Request-ID`        | same as delivery id                                          |

**Always verify the signature before processing.** Use the raw request body exactly as received.

Node:

```js
const crypto = require('crypto')
const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET)
  .update(`${req.headers['x-webhook-timestamp']}.${rawBody}`)
  .digest('hex')
const ok = crypto.timingSafeEqual(
  Buffer.from(hmac, 'hex'),
  Buffer.from(req.headers['x-webhook-signature'], 'hex')
)
if (!ok) return res.status(401).end()
```

PHP:

```php
$expected = hash_hmac('sha256', $timestamp . '.' . $rawBody, $WEBHOOK_SECRET);
if (!hash_equals($expected, $signature)) { http_response_code(401); exit; }
```

### Delivery semantics

- Acknowledged by any `2xx`; anything else or a timeout (5s) is retried.
- Retries with exponential backoff (1s, 2s, 4s, ... capped at 1h) up to **8 attempts**.
- Respond `2xx` as fast as possible — the request body is already persisted.

### Events

| Event             | Meaning                                              |
| ----------------- | ---------------------------------------------------- |
| `order.created`   | Order placed, wallet debited                          |
| `order.processing`| Accepted and sent to the unlock network               |
| `order.completed` | Finished — `result`/verification included             |
| `order.failed`    | Could not be completed                                |
| `order.cancelled` | Cancelled by you or the provider                      |
| `order.rejected`  | Rejected by the provider                              |
| `order.refunded`  | Amount refunded back to your wallet                   |
| `order.replied`   | Provider replied with notes/update                    |
| `test.ping`       | Admin's endpoint validation                           |

Payload shape:

```json
{
  "event": "order.completed",
  "deliveryId": "...",
  "timestamp": "2026-09-07T10:15:00.000Z",
  "data": { "order": { ... } }
}
```

## Errors

| HTTP | Code                  | Meaning                                                      |
| ---- | --------------------- | ------------------------------------------------------------ |
| 400  | `invalid_request`     | Malformed body or missing required fields                    |
| 400  | `validation_error`    | Field-level validation failed (e.g. required custom field)    |
| 401  | `unauthorized`        | Missing, invalid, or expired API key                          |
| 403  | `forbidden`           | Key valid but account suspended / permission denied           |
| 403  | `service_not_available` | Service not purchasable for your account                    |
| 404  | `not_found`           | Order or service not found                                    |
| 409  | `insufficient_balance`| Wallet balance below order price in that transaction          |
| 429  | `rate_limited`        | Per-key per-minute limit exceeded — retry after the window    |
| 500  | `internal_error`      | Server error — retry with the same `external_id` (idempotent) |

## Quick start

```bash
# 1. List services to find ids and your prices
curl -H "Authorization: Bearer YOUR_API_KEY" "$BASE/services?limit=50"

# 2. Create an order (idempotent by external_id)
curl -X POST "$BASE/orders" \
  -H "Authorization: Bearer YOUR_API_KEY" -H "Content-Type: application/json" \
  -d '{"external_id":"o-001","service_id":"clx...","imei":"351234567890123"}'

# 3. Check status
curl -H "Authorization: Bearer YOUR_API_KEY" "$BASE/orders/o-001"

# 4. Listen for status changes on your webhook endpoint
```

Support: open a support ticket from the dashboard or email your account admin to request a key or configure a webhook endpoint.