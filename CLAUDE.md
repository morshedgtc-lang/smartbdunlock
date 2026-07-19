# SmartBD Unlock — Long-Term Project Memory

## PROJECT STATUS
- **Deployed:** Railway (live at https://www.smartbdunlock.com)
- **State:** Core features COMPLETE, production running
- **Last Updated:** July 2026

## QUICK START
1. `npm install` (install deps)
2. `npx prisma generate` (generate Prisma client — NOTE: schema has pre-existing broken index, may need fix first)
3. `npm run dev` (runs on localhost:3000)
4. Login: Admin `admin@smartbdunlock.com` / `admin123`
5. Login: Client `reseller@smartbdunlock.com` / `reseller123`

## TECH STACK
- **Framework:** Next.js 16.2.10 (App Router + Turbopack)
- **Database:** PostgreSQL (Railway managed)
- **ORM:** Prisma 5.22.0
- **Auth:** JWT via `jose` (httpOnly cookie `sb_session`, 7-day expiry)
- **UI:** Tailwind CSS v4, framer-motion, custom liquid-glass components
- **Validation:** Zod v4
- **Password Hashing:** bcryptjs (12 rounds)
- **Deployment:** Railway (auto-deploy from git)

## ARCHITECTURE

### Two Roles Only
- **admin** — Full access to all features
- **reseller** — Client-facing role (UI labels show "Client" but DB role is `reseller`)

### Authentication Flow
- JWT stored in httpOnly cookie `sb_session`
- Session verified against DB on every `getSession()` call
- Token silently refreshed if DB data changed (role, name, userId)
- API key auth for external endpoints (SHA-256 hashed lookup)
- Gmail-only email verification with OTP (6-digit, 10-min expiry, 5 attempts)
- Account status: active, pending_approval, suspended, banned
- New registrations require email OTP verification + admin approval

### Public User ID System
- Format: `SBU100001`, `SBU100002`, etc. (updated from SBD)
- Generated transaction-safely in `src/lib/user-id.ts`
- Read-only, never editable
- Used across all dashboards for display

### Email Verification (Gmail-only)
- Registration requires Gmail address (@gmail.com)
- 6-digit OTP sent via Gmail SMTP (`nodemailer`)
- OTP hashed with bcrypt before storage
- Expires after 10 minutes, max 5 attempts
- Resend cooldown: 60 seconds
- After email verify → account status = `pending_approval`
- Admin must approve before user can login
- Admin receives email notification on new registration

### Database Models (16 in Prisma)
User, ServiceCategory, Service, ServiceCustomField, Supplier, Order, OrderNote, OrderCustomFieldValue, Transaction, Log, AuditLog, Notification, ApiKey, DepositRequest, SupplierJob, BulkOrderBatch

### CRITICAL: 6 Tables Outside Prisma Schema
These tables exist in the database but are NOT in `schema.prisma`:
1. `system_settings` — Used by `/api/settings` (raw SQL queries)
2. `SyncHistory` — Used by `/api/sync-history`
3. `PricingRule` — Used by `/api/pricing-rules`
4. `SupplierService` — Used by `/api/supplier-services`
5. `SupplierApiLog` — Used by `/api/suppliers` (sync history)
6. `OrderAttachment` — Used by `/api/orders/[id]`

**RISK:** These tables will be LOST if `prisma db push` runs or DB is recreated. The `start.sh` fallback uses `db push`, which is dangerous.

## KNOWN ISSUES (Priority Order)

### Critical
1. **Prisma schema broken index** — `Service` model has `@@index([supplierServiceId])` but `supplierServiceId` field doesn't exist in the model. This prevents `prisma generate` from working.
2. **6 tables outside Prisma** — No type safety, data loss risk on schema reset.
3. **No database indexes** on hot-path queries (Order.status, Order.createdAt, Notification.isRead).

### High
4. **No account lockout** — Only IP-based rate limiting (100/min). No per-user lockout after failed attempts.
5. **Hardcoded admin credentials** in seed file (admin123).
6. **No file type validation** on upload endpoint.
7. **No `.env.example`** — Required env vars scattered across code.

### Medium
8. **No tests** — Zero test files in entire codebase.
9. **No CSP security headers** in middleware.
10. **Cookie `sameSite` not explicitly set** (defaults to Lax).
11. **N+1 query risk** in dashboard API.

### Low
12. **No i18n** — All strings hardcoded English.
13. **No Storybook** — No component documentation.
14. **ConsoleInterceptor blocks console.log** in production.

## SECURITY NOTES

### What's Good
- JWT in httpOnly cookie (not accessible via JS)
- bcrypt password hashing (12 rounds)
- Rate limiting on login attempts (5 per 15 min per IP+email)
- Audit logging on all sensitive operations
- API keys SHA-256 hashed
- Supplier API keys encrypted with AES-256-GCM
- Security headers in middleware (HSTS, X-Frame-Options, etc.)

### What Needs Fixing
- No CSRF tokens (relies on SameSite=Lax)
- No account lockout after failed logins
- File upload accepts any MIME type
- No input sanitization beyond React defaults
- Error messages may leak internal details

## DEPLOYMENT

### Railway Config
- Build: `npx prisma generate && next build`
- Start: `bash scripts/start.sh` (runs `prisma migrate deploy`, falls back to `db push` for first deploy)
- Migrations auto-applied on deploy

### Required Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing secret (NOT `NEXTAUTH_SECRET`)
- `GMAIL_USER` — Gmail address for sending OTP emails
- `GMAIL_APP_PASSWORD` — Gmail app password (not regular password)
- `ADMIN_EMAIL` — Receives notifications for new registrations
- `SUPPLIER_ENCRYPTION_KEY` — AES-256-GCM key for supplier API keys
- `CRON_SECRET` — Bearer token for cron sync endpoint
- `IMGBB_API_KEY` — Image upload fallback
- `NEXT_PUBLIC_APP_URL` — Public app URL

### Deployment Safety
- `prisma migrate deploy` runs on boot (safe)
- `prisma db push` fallback is DANGEROUS for existing data
- Never run seed on production (creates default accounts)

## BUSINESS RULES

### Orders
- Status flow: pending → processing → completed/failed/cancelled/refunded
- Orders deduct wallet balance via Transaction records
- Each order can have custom field values, notes, and attachments
- Internal notes are admin-only; visible notes are client-facing
- Order timeline must be preserved

### Wallet
- Admin can deposit/transfer to any user
- Reseller can view balance and request deposits
- All transactions recorded with audit trail
- Refunds create order_refund transactions

### Services
- Admin creates and manages services
- Services can have custom fields for order forms
- Supplier services can be synced and approved
- Pricing rules calculate selling prices

### Users
- Admin creates users (or users self-register as reseller)
- Each user gets permanent SBD userId
- One reseller can manage multiple client accounts
- Users can be active, suspended, or banned

## FILE STRUCTURE (Key Files)

### Authentication
- `src/lib/auth.ts` — JWT session management
- `src/lib/api.tsx` — AuthProvider + ProtectedRoute
- `src/app/api/auth/` — login, register, logout, session, change-password

### Database
- `prisma/schema.prisma` — Main schema (16 models)
- `src/lib/prisma.ts` — Singleton Prisma client
- `src/lib/user-id.ts` — Public user ID generator

### API Routes
- `src/app/api/` — All API endpoints
- `src/lib/validations.ts` — Zod schemas for all inputs

### UI Components
- `src/components/ui/` — Glass UI components
- `src/components/layout/` — Dashboard layout, sidebar, header
- `src/app/(dashboard)/` — Admin and reseller pages

### Suppliers
- `src/lib/suppliers/` — Adapter pattern, sync engine, failover

## DEVELOPMENT RULES

1. **Maintain TypeScript strict mode** — No `any` types in new code
2. **Keep build at 0 errors** — Run `npx tsc --noEmit` before committing
3. **Use existing glass UI components** — Don't create new component styles
4. **Add audit logs for admin actions** — Use `auditLog()` helper
5. **Add notifications for important events** — Use notification helpers
6. **Preserve responsive design** — Test on mobile and desktop
7. **Don't break Railway deployment** — Test build before pushing

## FUTURE PRIORITIES (In Order)

1. **Fix Prisma schema** — Add missing index, bring 6 tables into schema
2. **Add database indexes** — Performance optimization
3. **Add account lockout** — Security hardening
4. **Add tests** — Auth, orders, wallet
5. **Add CSP headers** — Security
6. **Add file type validation** — Upload security
7. **Create .env.example** — Developer experience
8. **Add i18n** — Internationalization
9. **Add Storybook** — Component documentation

## COMMANDS TO REMEMBER

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run lint             # Run ESLint

# Database
npx prisma generate      # Generate Prisma client
npx prisma migrate dev   # Create new migration
npx prisma migrate deploy # Apply migrations (production)
npx prisma db push       # DANGEROUS - syncs schema without migration
npx tsx prisma/seed.ts   # Seed database (dev only)

# Type Checking
npx tsc --noEmit         # Check TypeScript errors

# Deployment
git push origin main     # Triggers Railway deploy
```

## SESSION MEMORY

When starting a new session on this project:
1. Check if `prisma generate` works (may need to fix broken index first)
2. Check if dev server starts (`npm run dev`)
3. Review this CLAUDE.md for context
4. Check `AGENTS.md` for additional instructions
5. Look at recent git commits for what changed

## IMPORTANT NOTES

- **Windows PowerShell:** Use `;` not `&&` for chaining commands
- **StatusBadge is case-insensitive** (converts to lowercase)
- **Order statuses are all lowercase** (pending, processing, completed, etc.)
- **Admin UI labels show "Client"** but DB role is `reseller`
- **Production uses JWT_SECRET** not NEXTAUTH_SECRET
- **Seed creates default accounts** — never run on production
