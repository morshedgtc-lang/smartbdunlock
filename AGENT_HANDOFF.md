# Agent Handoff — SmartBD Unlock

## Project Overview
- **App**: SmartBD Unlock — GSM Service Reseller Platform
- **Stack**: Next.js 16.2.10, Prisma 5.22.0 (SQLite), NextAuth 4.x, Tailwind 4, framer-motion, TypeScript
- **Roles**: Admin + Reseller only (Customer role REMOVED)
- **Dev Server**: Running on `http://localhost:3000` (may need restart)
- **Database**: SQLite at `prisma/dev.db`
- **Login**: Admin `admin@smartbdunlock.com` / `admin123`, Reseller `reseller@smartbdunlock.com` / `reseller123`

## What's Done (All Complete)

### Phase 1: Remove Customer Role
- Deleted customer dashboard, register page, customer API routes
- Cleaned sidebar, login, landing page, middleware — all customer references removed
- Schema: User has `role` (admin/reseller), `walletBalance`, `status`

### Phase 2: Fix StatusBadge
- Case-insensitive lookup (lowercase keys), auto-formats label from snake_case

### Phase 3: Fix Order Status Filter
- Admin orders filter options use lowercase (matching DB values)

### Phase 4: Full CRUD
- **Services**: Add/Edit/Delete modals in admin services page; POST/PATCH/DELETE in `/api/services`
- **Suppliers**: Add/Edit/Delete modals in admin suppliers page; POST/PATCH/DELETE in `/api/suppliers`
- **Users**: Add/Edit/Suspend in admin users page; POST/PATCH/DELETE in `/api/users`
- **Orders**: List + detail modal + status updates; PATCH in `/api/orders`
- **Order Reply Note**: Textarea + Send Reply button in order detail modal (saves to `notes` field)

### Phase 5: Fix Dashboard Stats
- `completedToday` uses `completedAt` date filter
- `revenueToday` filters by today's completed orders
- `revenueThisMonth` uses proper month start
- Admin dashboard has 3 quick action cards: New Order, Add Service, Add User

### Phase 6: Cleanup
- Removed dead code, unused imports, duplicate files
- Fixed wrong model fields throughout codebase
- Landing page: no customer/register references, single CTA
- Sidebar: no customer links
- Settings page: static placeholder (harmless)

## What Might Need Work

### Potential Next Steps
1. **Commit & push** all changes to `https://github.com/morshedgtc-lang/smartbdunlock.git`
2. **Test end-to-end**: Create service → Create order → Update status → Check wallet balance
3. **Reseller order creation**: The modal in `/reseller/orders` may need testing with real services
4. **Order result field**: PATCH supports `result` but UI doesn't have input for it yet
5. **Settings page**: Currently static, no backend — could add real backend or remove
6. **File uploads**: 7-day secure links mentioned in landing page — not implemented yet

### Known Issues
- Dev server may need manual restart if it crashes
- Database is SQLite — fine for dev, not production
- No email/password reset flow
- No real-time updates (would need WebSocket)

## Key Files
- `src/app/page.tsx` — Landing page
- `src/app/login/page.tsx` — Login with demo buttons
- `src/middleware.ts` — Auth (admin + reseller only)
- `src/components/layout/Sidebar.tsx` — Navigation
- `src/components/layout/DashboardLayout.tsx` — Shared layout
- `src/components/ui/StatusBadge.tsx` — Case-insensitive badge
- `src/app/(dashboard)/admin/dashboard/page.tsx` — Admin dashboard with quick actions
- `src/app/(dashboard)/admin/orders/page.tsx` — Orders with reply note
- `src/app/(dashboard)/admin/services/page.tsx` — Service CRUD
- `src/app/(dashboard)/admin/suppliers/page.tsx` — Supplier CRUD
- `src/app/(dashboard)/admin/users/page.tsx` — User management
- `src/app/(dashboard)/admin/wallet/page.tsx` — Admin wallet (deposit/transfer)
- `src/app/(dashboard)/reseller/dashboard/page.tsx` — Reseller dashboard
- `src/app/(dashboard)/reseller/orders/page.tsx` — Reseller orders + create
- `src/app/(dashboard)/reseller/wallet/page.tsx` — Reseller wallet (view only)
- `src/app/api/orders/route.ts` — GET + POST + PATCH
- `src/app/api/services/route.ts` — CRUD
- `src/app/api/suppliers/route.ts` — CRUD
- `src/app/api/users/route.ts` — CRUD
- `src/app/api/wallet/route.ts` — GET + POST (deposit/transfer)
- `src/app/api/dashboard/route.ts` — Stats
- `prisma/schema.prisma` — 6 models
- `prisma/seed.ts` — Seed data

## Environment Notes
- **OS**: Windows 11 Pro, PowerShell 5.1
- **Shell**: `&&` fails — use `;` for command chaining
- **Node**: Available via PowerShell
- **WSL2**: Ubuntu 24.04.4 LTS available but project runs in Windows
