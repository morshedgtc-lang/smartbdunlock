# SmartBD Unlock — Agent Instructions

## Project State: Core features COMPLETE
All core features are built and working. Dev server runs on localhost:3000.

## Quick Start
1. `npm run dev` (or restart if needed)
2. Login: Admin `admin@smartbdunlock.com` / `admin123`

3. Login: Client `reseller@smartbdunlock.com` / `reseller123`
## Stack
- Next.js 16.2.10 (App Router + Turbopack), Prisma 5.22.0 (PostgreSQL), Tailwind 4, framer-motion, TypeScript
- JWT auth via `jose` (httpOnly cookie `sb_session`, 7-day expiry)
- 2 roles only: Admin + Client (DB role stays `reseller`, UI label "Client")
- 16 DB models: User, ServiceCategory, Service, ServiceCustomField, Supplier, Order, OrderNote, OrderCustomFieldValue, Transaction, Log, AuditLog, Notification, ApiKey, DepositRequest, SupplierJob, BulkOrderBatch

## Public User ID
- Each user has a permanent public `userId` (format `SBD100001`) — see `src/lib/user-id.ts`
- Generated transaction-safely, read-only, backfilled by migration `20250718_add_user_public_id`
- Shown in dashboard, wallet, deposit-request, profile dropdown, and admin users/deposit-requests tables

## Key Conventions
- Windows PowerShell: use `;` not `&&` for chaining commands
- StatusBadge is case-insensitive (converts to lowercase)
- Order statuses: pending, processing, completed, failed, cancelled (all lowercase)
- Wallet: admin can deposit/transfer; client can view only
- Order reply notes saved to `notes` field via PATCH /api/orders
- Production requires `JWT_SECRET` env var (the app reads `JWT_SECRET`, NOT `NEXTAUTH_SECRET`)

## Files to Know
See `AGENTS.md` for full agent instructions and `docs/` for project analysis.

## Deploy Configuration
- Platform: Railway
- Production URL: https://smartbdunlock.com
- Build: `npx prisma generate && next build`
- Start: `bash scripts/start.sh` (runs `prisma migrate deploy` on boot)
- Migrations auto-applied on deploy; no manual step for Railway
