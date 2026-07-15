# SmartBD Unlock — Agent Instructions

## Project State: Phase 1-6 COMPLETE
All core features are built and working. Dev server running on localhost:3000.

## Quick Start
1. `npm run dev` (or restart if needed)
2. Login: Admin `admin@smartbdunlock.com` / `admin123`

3. Login: Client `reseller@smartbdunlock.com` / `reseller123`
## Stack
- Next.js 16.2.10, Prisma 5.22.0 (PostgreSQL), Tailwind 4, framer-motion, TypeScript
- JWT auth via `jose` (httpOnly cookie `sb_session`)
- 2 roles only: Admin + Client (DB role stays `reseller`, UI label "Client")
- 7 DB models: User, Service, ServiceCategory, ServiceCustomField, Supplier, Order, Transaction

## Key Conventions
- Windows PowerShell: use `;` not `&&` for chaining commands
- StatusBadge is case-insensitive (converts to lowercase)
- Order statuses: pending, processing, completed, failed, cancelled (all lowercase)
- Wallet: admin can deposit/transfer; client can view only
- Order reply notes saved to `notes` field via PATCH /api/orders

## Files to Know
See `AGENT_HANDOFF.md` for full details on what's done and what might need work.

## Deploy Configuration (configured by /setup-deploy)
- Platform: manual (public_html)
- Production URL: https://smartbdunlock.com
- Deploy workflow: manual deployment
- Deploy status command: HTTP health check
- Merge method: merge
- Project type: web app
- Post-deploy health check: https://smartbdunlock.com

### Custom deploy hooks
- Pre-merge: npm run build
- Deploy trigger: manual (upload to public_html)
- Deploy status: HTTP health check at production URL
- Health check: https://smartbdunlock.com
