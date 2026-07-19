# SmartBD Unlock

GSM mobile service management platform for resellers and clients. Handles orders, services, wallets, suppliers, and API integrations.

**Live:** https://www.smartbdunlock.com

## Tech Stack

- **Framework:** Next.js 16 (App Router + Turbopack)
- **Language:** TypeScript 5 (strict mode)
- **UI:** Tailwind CSS v4, Framer Motion, Lucide icons
- **Auth:** JWT via jose (httpOnly cookie, 7-day expiry)
- **Database:** PostgreSQL via Prisma 5
- **Validation:** Zod v4
- **Deployment:** Railway

## Features

**Admin**
- Dashboard with analytics
- User management (admin/reseller roles)
- Service catalog with custom fields
- Custom field image preview (ImgBB upload)
- Order management with status tracking
- Supplier management with adapter pattern + failover
- Wallet and deposit request handling
- Audit trail with CSV export
- API key management for external access
- Real-time notifications (SSE)
- File upload with 7-day expiry

**Reseller (Client)**
- Dashboard with stats
- Service marketplace
- Order placement with dynamic fields
- Wallet and deposit requests
- Bulk order upload (CSV)
- Profile and password management

**External API**
- API key authentication (SHA-256 hashed)
- REST endpoints for services and orders
- Rate limiting (100 req/min)

## Getting Started

```bash
# Clone
git clone https://github.com/morshedgtc-lang/smartbdunlock.git
cd smartbdunlock

# Install
npm install

# Setup database
npx prisma generate
npx prisma db push

# Seed (optional)
npx tsx prisma/seed.ts

# Dev
npm run dev
```

Open http://localhost:3000

## Environment Variables

```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
IMGBB_API_KEY=your-imgbb-api-key
```

- `JWT_SECRET` is required in production. Without it, the app falls back to an insecure dev key.
- `IMGBB_API_KEY` is required for image preview uploads. Get one free at https://api.imgbb.com/

## Database

17 models via Prisma. Key entities:

| Model | Purpose |
|-------|---------|
| User | Auth, roles, public userId (SBD format) |
| Service | Catalog with custom fields |
| Order | Core order engine with status lifecycle |
| Transaction | Wallet ledger |
| Supplier | API/manual/mock adapters |
| SupplierJob | Async supplier job queue |
| AuditLog | Security audit trail |
| ApiKey | External API access |
| Notification | Real-time alerts (SSE) |
| DepositRequest | Funding requests |
| BulkOrderBatch | CSV upload tracking |

Migrations in `prisma/migrations/`. Auto-applied on deploy via `scripts/start.sh`.

## API Routes

| Route | Purpose |
|-------|---------|
| `/api/auth/*` | Login, session, logout, change-password |
| `/api/orders/*` | CRUD, notes, timeline, bulk |
| `/api/services/*` | CRUD with custom fields |
| `/api/users/*` | User management (admin) |
| `/api/wallet` | Balance and transactions |
| `/api/deposit-requests` | Deposit lifecycle |
| `/api/notifications` | List + SSE stream |
| `/api/api-keys` | Key management |
| `/api/external/*` | Public API (key auth) |
| `/api/audit-logs` | Audit trail |
| `/api/reporting` | Analytics data |
| `/api/upload` | File uploads |
| `/api/upload/imgbb` | Image upload to ImgBB |
| `/api/health` | Health check |

## Project Structure

```
src/
  middleware.ts          # Rate limiting, CORS, security headers
  app/
    layout.tsx           # Root layout (fonts, providers, SVG filters)
    page.tsx             # Landing page
    login/               # Login page
    api/                 # 37 API route files
    (dashboard)/
      admin/             # 12 admin pages
      reseller/          # 8 reseller pages
  components/
    layout/              # Sidebar, Header, BottomNav, DashboardLayout
    ui/                  # GlassCard, GlassButton, Modal, Toast, etc.
    admin/               # OrderDetailDrawer
  hooks/                 # useApi, useGlassEffect
  lib/
    auth.ts              # JWT session management
    prisma.ts            # Database singleton
    api.tsx              # Client auth context
    validations.ts       # Zod schemas
    audit.ts             # Audit logging
    notifications.ts     # Notification helpers
    logger.ts            # App logging
    api-key-auth.ts      # API key verification
    user-id.ts           # Public ID generator
    suppliers/           # Adapter pattern subsystem
prisma/
  schema.prisma          # Database schema
  seed.ts                # Dev seed data
  migrations/            # 8 migrations
scripts/
  start.sh               # Railway startup script
```

## Deployment

```bash
# Railway
Build: npx prisma generate && next build
Start: bash scripts/start.sh
```

`scripts/start.sh` runs `prisma migrate deploy` on boot.

## Default Credentials (Dev)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@smartbdunlock.com | admin123 |
| Reseller | reseller@smartbdunlock.com | reseller123 |

## License

MIT
