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
- nodemailer (Gmail SMTP for OTP)

## Deployment
Platform: Railway
Build Command: npx prisma generate && next build
Start Command: bash scripts/start.sh
- `scripts/start.sh` runs `prisma migrate deploy` on boot
- `ensure-admin-unverified.js` runs on every deploy (creates/resets admin)
- New migrations auto-applied on deploy

## Authentication
- JWT stored in httpOnly cookie: sb_session
- Session expiry: 7 days
- Roles: admin, reseller
- Password hashing: bcryptjs (12 rounds)
- Email verification: 6-digit OTP (bcrypt-hashed, 10-min expiry, 5 max attempts)
- Any email address accepted for registration
- OTP auto-sent on login when email not verified
- Account lockout: 5 failed attempts = 15 min lockout

## Database
PostgreSQL with 22 tables:
User, ServiceCategory, Service, ServiceCustomField, Supplier, Order, OrderNote, OrderCustomFieldValue, OrderAttachment, Transaction, Log, AuditLog, Notification, ApiKey, DepositRequest, SupplierJob, BulkOrderBatch, SupplierService, PricingRule, SyncHistory, SupplierApiLog, SystemSetting

### Public User ID
- The `User` model has a public `userId` field (format `SBU100001`, `SBU100002`, …).
- Generated transaction-safely by `src/lib/user-id.ts` `generateUserId()`.
- `userId` is **read-only**: never editable.
- Internal relations use the opaque `id` (cuid); `userId` is purely a customer-facing identifier.

## Security Rules
- Never expose supplier API keys
- Never expose service cost to reseller/client APIs
- Only return clientVisible=true and status=active services to clients
- All API keys must be SHA-256 hashed
- Maintain audit logging for sensitive actions
- Keep rate limiting enabled (100 req/min)
- Preserve security headers in middleware
- Production requires `JWT_SECRET` env var

## Business Rules
- One reseller can manage multiple client accounts
- Each user has a permanent public `userId` (SBU format) shown across dashboards
- Orders deduct wallet balance using Transaction records
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
- Wallet system with deposit requests
- Notification system (SSE real-time)
- API key management
- External REST API
- Audit trail with CSV export
- Reporting dashboard
- File management with UUID filenames
- Change password modal
- Profile dropdown
- Permanent public User ID (SBU format) across all dashboards
- Email verification with OTP
- Admin approval flow for new registrations
- Supplier management and sync
- Pricing rules engine
- Bulk order upload

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
/api/auth/login, /api/auth/register, /api/auth/verify-otp, /api/auth/resend-otp
/api/orders, /api/orders/[id], /api/orders/[id]/notes, /api/orders/[id]/timeline
/api/notifications, /api/notifications/stream
/api/api-keys, /api/external/services, /api/external/orders
/api/reporting, /api/audit-logs, /api/upload, /api/files
/api/auth/change-password, /api/admin/users, /api/admin/users/[id]

## Future Priority
1. Tests (auth, orders, wallet)
2. CSP security headers
3. Currency as Decimal (not Float)
4. Multi-currency wallet
5. Webhook integrations
6. Team/staff permissions
7. Mobile PWA support
8. AI-assisted order processing

## Current Production Status
- Build: Clean (0 errors, 0 warnings)
- Deployment: Live on Railway
- Database: PostgreSQL (22 models)
- Auth: JWT + OTP email verification
- Notifications: SSE working
- API Keys: Working
- External API: Working
- Reporting: Working
- Client Dashboard: Upgraded
- Order Timeline: Working
- Public User ID: Implemented (SBU format)
- Security: Account lockout, rate limiting, audit logging
