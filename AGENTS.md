<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# unlockOS — Agent Instructions

## Project State: Phase 1-6 COMPLETE
All core features are built and working. Dev server running on localhost:3000.

## Quick Start
1. `npm run dev` (or restart if needed)
2. Login: Admin `admin@unlockos.com` / `admin123`
3. Login: Reseller `reseller@unlockos.com` / `reseller123`

## Stack
- Next.js 16.2.10, Prisma 5.22.0 (SQLite), NextAuth 4.x, Tailwind 4, framer-motion, TypeScript
- 2 roles only: Admin + Reseller (Customer REMOVED)
- 6 DB models: User, Session, Service, Supplier, Order, Transaction

## Key Conventions
- Windows PowerShell: use `;` not `&&` for chaining commands
- StatusBadge is case-insensitive (converts to lowercase)
- Order statuses: pending, processing, completed, failed, cancelled (all lowercase)
- Wallet: admin can deposit/transfer; reseller can view only
- Order reply notes saved to `notes` field via PATCH /api/orders

## Files to Know
See `AGENT_HANDOFF.md` for full details on what's done and what might need work.
