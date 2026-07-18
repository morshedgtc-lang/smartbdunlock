# SmartBD Unlock - AI Agent Instructions

## Repository
https://github.com/morshedgtc-lang/smartbdunlock.git

## Live Production
https://www.smartbdunlock.com

## Technology Stack
- Next.js 16.2.10 (App Router + Turbopack)
- React 19
- TypeScript 5
- Tailwind CSS v4
- Prisma 5.22.0
- PostgreSQL (Railway)
- framer-motion
- jose (JWT auth)
- bcryptjs (password hashing)
- Zod v4 validation

## Deployment
Platform: Railway
Build Command: npx prisma generate && next build
Start Command: bash scripts/start.sh
- `scripts/start.sh` runs `prisma migrate deploy` on boot (falls back to `db push` only for first deploy)
- New migrations (e.g. `20250718_add_user_public_id`) are auto-applied on deploy; no manual step needed for Railway
- NOTE: `deploy.sh`/`setup-server.sh` currently set `NEXTAUTH_SECRET` (which the app does NOT read) instead of `JWT_SECRET`; the app reads `JWT_SECRET` and falls back to an insecure dev key if unset — fix before next production deploy

## Authentication
- JWT stored in httpOnly cookie: sb_session
- Session expiry: 7 days
- Roles: admin, reseller
- Password hashing: bcryptjs (12 rounds)

## Database
PostgreSQL with 16 tables:
User, ServiceCategory, Service, ServiceCustomField, Supplier, Order, OrderNote, OrderCustomFieldValue, Transaction, Log, AuditLog, Notification, ApiKey, DepositRequest, SupplierJob, BulkOrderBatch

### Public User ID
- The `User` model has a public `userId` field (format `SBD100001`, `SBD100002`, …).
- Generated transaction-safely by `src/lib/user-id.ts` `generateUserId()` (max-existing + 1, unique-constraint retry).
- Backfilled for existing users by migration `20250718_add_user_public_id`.
- `userId` is **read-only**: not present in `updateUserSchema` and not in the PATCH allow-list, so it can never be edited.
- Internal relations (orders, transactions, resellerId, etc.) still use the opaque `id` (cuid); `userId` is purely a customer-facing identifier.
- `SessionUser` carries `userId`; session API and `AuthUser` expose it for display in dashboard, wallet, deposit-request, profile dropdown, and admin users/deposit-requests tables.

## Security Rules
- Never expose supplier API keys
- Never expose service cost to reseller/client APIs
- Only return clientVisible=true and status=active services to clients
- All API keys must be SHA-256 hashed
- Maintain audit logging for sensitive actions (include `userId` / public `userPublicId` where relevant)
- Keep rate limiting enabled (100 req/min)
- Preserve security headers in middleware
- Production requires `JWT_SECRET` env var (NOT `NEXTAUTH_SECRET` — the app reads `JWT_SECRET`; if unset it falls back to an insecure dev key and must not be deployed)

## Business Rules
- One reseller can manage multiple client accounts
- Each user has a permanent public `userId` (SBD format) shown across dashboards
- Orders deduct wallet balance using Transaction records (transactions include public user ID in description)
- Refunds create order_refund transactions
- Order timeline must be preserved
- Internal notes are admin-only
- Visible notes are client-facing
- Deleting orders must cascade to notes and custom field values

## Current Features
- Client dashboard with glass UI
- Service marketplace
- Order creation with dynamic fields
- Order details page with timeline
- Wallet system
- Notification system (SSE real-time)
- API key management
- External REST API
- Audit trail with CSV export
- Reporting dashboard
- File management with UUID filenames
- Change password modal
- Profile dropdown
- Permanent public User ID (SBD format) across all dashboards

## Development Rules
1. Maintain TypeScript strict mode
2. Keep build at 0 errors / 0 warnings
3. Remove dead code when replacing features
4. Use existing glass UI components
5. Add audit logs for admin actions
6. Add notifications for important user events
7. Preserve responsive design
8. Do not break Railway deployment

## Important API Endpoints
/api/orders
/api/orders/[id]/notes
/api/orders/[id]/timeline
/api/notifications
/api/notifications/stream
/api/api-keys
/api/external/services
/api/external/orders
/api/reporting
/api/audit-logs
/api/upload
/api/files
/api/auth/change-password

## Future Priority
1. Supplier automation
2. Multi-currency wallet
3. Bulk order upload
4. Webhook integrations
5. Advanced analytics
6. Team/staff permissions
7. Mobile PWA support
8. AI-assisted order processing

## Current Production Status
- Build: Clean (0 errors, 0 warnings)
- Deployment: Live on Railway
- Database: PostgreSQL connected
- Notifications: SSE working
- API Keys: Working
- External API: Working
- Reporting: Working
- Client Dashboard: Upgraded
- Order Timeline: Working
- Public User ID: Implemented (migration 20250718_add_user_public_id)
- Security Audit: Completed
