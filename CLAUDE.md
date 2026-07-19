# SmartBD Unlock — Long-Term Project Memory

## PROJECT STATUS
- **Deployed:** Railway (live at https://www.smartbdunlock.com)
- **State:** Core features COMPLETE, production running
- **Last Updated:** July 2026

## QUICK START
1. `npm install`
2. `npx prisma generate`
3. `npm run dev` (localhost:3000)
4. Admin: `admin@smartbdunlock.com` / `admin123` (OTP required)
5. Reseller: `reseller@smartbdunlock.com` / `reseller123` (OTP required)

## TECH STACK
- **Framework:** Next.js 16.2.10 (App Router + Turbopack)
- **Database:** PostgreSQL (Railway managed)
- **ORM:** Prisma 5.22.0 (22 models)
- **Auth:** JWT via `jose` (httpOnly cookie `sb_session`, 7-day expiry)
- **UI:** Tailwind CSS v4, framer-motion, custom liquid-glass components
- **Validation:** Zod v4
- **Password Hashing:** bcryptjs (12 rounds)
- **Email:** nodemailer (Gmail SMTP for OTP)
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
- Email verification with OTP (6-digit, bcrypt-hashed, 10-min expiry, 5 attempts)
- **Any email address** accepted for registration (not Gmail-only)
- OTP auto-sent on login when email not verified
- Account status: active, pending_approval, suspended, banned
- New registrations require email OTP verification + admin approval
- Admin receives email notification on new registration

### Public User ID System
- Format: `SBU100001`, `SBU100002`, etc.
- Generated transaction-safely in `src/lib/user-id.ts`
- Read-only, never editable
- Used across all dashboards for display

### Email Verification
- 6-digit OTP sent via Gmail SMTP (`nodemailer`)
- OTP hashed with bcrypt before storage
- Expires after 10 minutes, max 5 attempts
- Resend cooldown: 60 seconds
- After email verify → account status = `pending_approval`
- Admin must approve before user can login
- Admin receives email notification on new registration

### Database Models (22 in Prisma)
User, ServiceCategory, Service, ServiceCustomField, Supplier, Order, OrderNote, OrderCustomFieldValue, OrderAttachment, Transaction, Log, AuditLog, Notification, ApiKey, DepositRequest, SupplierJob, BulkOrderBatch, SupplierService, PricingRule, SyncHistory, SupplierApiLog, SystemSetting

### All Tables in Prisma Schema
All 22 tables are defined in `schema.prisma`. No raw SQL table access needed.

## KNOWN ISSUES (Priority Order)

### High
1. **No tests** — Zero test files in entire codebase
2. **Currency as Float** — walletBalance, Transaction.amount use Float instead of Decimal (rounding risk)
3. **No CSP security headers** in middleware

### Medium
4. **String-based enums** — Roles/statuses use String instead of Prisma enums (validated by Zod only)
5. **No CSRF tokens** — Relies on SameSite=Lax cookies
6. **DepositRequest.screenshot** stores base64 data URLs in DB
7. **In-memory rate limiting** — Resets on cold start in serverless

### Low
8. **No i18n** — All strings hardcoded English
9. **No Storybook** — No component documentation
10. **Log/AuditLog tables** grow unbounded (no TTL/cleanup)

## SECURITY NOTES

### What's Good
- JWT in httpOnly cookie (not accessible via JS)
- bcrypt password hashing (12 rounds)
- Account lockout after 5 failed logins (15 min)
- Rate limiting on login attempts (5 per 15 min per IP+email)
- Audit logging on all sensitive operations
- API keys SHA-256 hashed
- Supplier API keys encrypted with AES-256-GCM
- Security headers in middleware (HSTS, X-Frame-Options, etc.)

### What Needs Fixing
- No CSRF tokens (relies on SameSite=Lax)
- File upload accepts any MIME type
- No input sanitization beyond React defaults

## DEPLOYMENT

### Railway Config
- Build: `npx prisma generate && next build`
- Start: `bash scripts/start.sh` (runs `prisma migrate deploy`)
- `ensure-admin-unverified.js` runs on every deploy (creates/resets admin)
- Migrations auto-applied on deploy

### Required Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing secret (NOT `NEXTAUTH_SECRET`)
- `GMAIL_USER` — Gmail address for sending OTP emails
- `GMAIL_APP_PASSWORD` — Gmail app password
- `ADMIN_EMAIL` — Receives notifications for new registrations
- `SUPPLIER_ENCRYPTION_KEY` — AES-256-GCM key for supplier API keys
- `CRON_SECRET` — Bearer token for cron sync endpoint

## BUSINESS RULES

### Orders
- Status flow: pending → processing → completed/failed/cancelled/refunded
- Orders deduct wallet balance via Transaction records
- Each order can have custom field values, notes, and attachments
- Internal notes are admin-only; visible notes are client-facing

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
- Admin creates users (or users self-register)
- Each user gets permanent SBU userId
- One reseller can manage multiple client accounts
- Users can be active, suspended, or banned

## FILE STRUCTURE (Key Files)

### Authentication
- `src/lib/auth.ts` — JWT session management
- `src/lib/api.tsx` — AuthProvider + ProtectedRoute
- `src/app/api/auth/` — login, register, logout, session, verify-otp, resend-otp, change-password

### Database
- `prisma/schema.prisma` — Main schema (22 models)
- `src/lib/prisma.ts` — Singleton Prisma client
- `src/lib/user-id.ts` — Public user ID generator
- `src/lib/utils.ts` — Shared utilities (timeAgo, formatDate)

### API Routes
- `src/app/api/` — All API endpoints (37+ routes)
- `src/lib/validations.ts` — Zod schemas for all inputs

### UI Components
- `src/components/ui/` — Glass UI components (29 components)
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

# Type Checking
npx tsc --noEmit         # Check TypeScript errors

# Deployment
git push origin main     # Triggers Railway deploy
```

## SESSION MEMORY

When starting a new session on this project:
1. Run `npx prisma generate`
2. Run `npm run dev` to verify server starts
3. Review this CLAUDE.md for context
4. Check recent git commits

## IMPORTANT NOTES

- **Windows PowerShell:** Use `;` not `&&` for chaining commands
- **StatusBadge is case-insensitive** (converts to lowercase)
- **Order statuses are all lowercase** (pending, processing, completed, etc.)
- **Admin UI labels show "Client"** but DB role is `reseller`
- **Production uses JWT_SECRET** not NEXTAUTH_SECRET
- **OTP for any email** — registration accepts all email addresses
