<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# SmartBD Unlock — Agent Instructions

## Project State
GSM service reseller management platform. Dev server on localhost:3000.

## Quick Start
1. `npm run dev`
2. Login: Admin `admin@smartbdunlock.com` / `admin123`
3. Login: Reseller `reseller@smartbdunlock.com` / `reseller123`

## Commands
- `npm run dev` — dev server (Turbopack)
- `npm run build` — production build (Turbopack)
- `npm run lint` — ESLint (0 errors, ~126 warnings from `no-explicit-any`)
- `npx prisma generate` — regenerate Prisma client after schema changes
- `npx prisma db push` — sync schema to DB (dev only; prod uses `migrate deploy`)

Build, lint, and typecheck all pass. No test suite exists.

## Stack
- Next.js 16.2.10 (App Router, Turbopack), React 19, TypeScript 5
- Prisma 5.22.0 (PostgreSQL), Tailwind 4, framer-motion, lucide-react
- JWT auth via `jose` (httpOnly cookie `sb_session`, 7-day expiry)
- Zod v4 for API input validation (`src/lib/validations.ts`)
- Deployed on Railway (`railway.toml`)

## Architecture

### Route Structure
- `src/app/(dashboard)/admin/` — Admin dashboard (protected, `requireAdmin()`)
- `src/app/(dashboard)/reseller/` — Reseller dashboard (protected, `requireAuth()`)
- `src/app/api/` — REST API endpoints (11 route groups)
- `src/app/login/` — Login page
- `src/app/page.tsx` — Public landing page

### API Endpoints
`auth/login`, `auth/logout`, `auth/session`, `dashboard`, `health`, `logs`, `audit-logs`, `orders`, `services`, `service-categories`, `suppliers`, `users`, `wallet`

### Key Lib Files
- `src/lib/auth.ts` — JWT session management (`createSession`, `getSession`, `requireAuth`, `requireAdmin`)
- `src/lib/prisma.ts` — Prisma singleton (global in dev to avoid connection exhaustion)
- `src/lib/validations.ts` — Zod schemas for all API inputs + `validateBody`/`validateQuery` helpers
- `src/lib/audit.ts` — Audit logging utility (`auditLog`, `getClientIp`, `getClientUserAgent`)
- `src/lib/api.tsx` — React context for auth (`AuthProvider`, `useAuth`)
- `src/lib/logger.ts` — DB-backed application logging

### Middleware (`src/middleware.ts`)
- Rate limiting: 100 requests/minute per IP (in-memory map)
- Body size limit: 5MB on POST/PUT/PATCH
- Security headers: HSTS, CSP, X-Frame-Options: DENY, etc.
- Applies to all routes except `_next/static`, `_next/image`, `favicon.ico`

## Database
PostgreSQL. 9 models: User, ServiceCategory, Service, ServiceCustomField, Supplier, Order, OrderCustomFieldValue, Transaction, Log, AuditLog.

### Auth
- JWT via `jose`, stored in httpOnly cookie `sb_session`
- Two roles: `admin`, `reseller` (Customer role removed)
- `requireAuth()` throws `Error('Unauthorized')`, `requireAdmin()` throws `Error('Forbidden')`
- In dev, falls back to insecure JWT_SECRET if not set

### Key Conventions
- Order statuses: `pending`, `processing`, `completed`, `failed`, `cancelled` (all lowercase)
- StatusBadge component is case-insensitive (converts to lowercase internally)
- Wallet: admin can deposit/transfer; reseller can view only
- Order reply notes saved to `notes` field via PATCH `/api/orders`
- Audit logs track all CRUD actions across users, orders, services, suppliers, categories, wallet, and auth

## Validation Pattern
All API routes use Zod schemas from `src/lib/validations.ts`:
```ts
import { validateBody, loginSchema } from '@/lib/validations'
const result = validateBody(loginSchema, body)
if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })
```
Note: This project uses **Zod v4** which has different API from v3 (e.g., `z.enum()` takes a string message, not `{ errorMap }`).

## Deploy
- Platform: Railway
- Build: `npx prisma generate && next build`
- Start: `bash scripts/start.sh` (handles first-deploy migration bootstrap)
- `scripts/start.sh` tries `prisma migrate deploy`; on failure falls back to `db push` + `migrate resolve --applied`
- Prisma migrations live in `prisma/migrations/`

## Gotchas
- `@/*` path alias maps to `src/*`
- `prisma.ts` uses global singleton pattern — don't create new PrismaClient instances elsewhere
- Auth functions throw errors (not return responses) — catch them in route handlers
- ESLint: `no-explicit-any` is `warn`, not `error` — `any` is used in several API routes for Prisma query `where` clauses
- No test suite — verify changes with `npm run build` and `npm run lint`
- `.env*` files are gitignored — see `.env.example` for required vars (`DATABASE_URL`, `JWT_SECRET`)
