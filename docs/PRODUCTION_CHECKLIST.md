# Production Deployment Checklist

## Pre-Deployment

- [ ] `JWT_SECRET` set to a random 64-char hex string
- [ ] `SUPPLIER_ENCRYPTION_KEY` set to 32 bytes (64 hex chars)
- [ ] `GMAIL_USER` + `GMAIL_APP_PASSWORD` configured
- [ ] `ADMIN_EMAIL` set to receive notifications
- [ ] `CRON_SECRET` set for sync endpoint
- [ ] `DATABASE_URL` pointing to production PostgreSQL
- [ ] `NEXT_PUBLIC_APP_URL` = `https://www.smartbdunlock.com`

## Security

- [ ] No dev fallback secrets in code (removed from auth.ts, crypto.ts)
- [ ] CSP header set (unsafe-eval removed)
- [ ] HTTPS enforced (Strict-Transport-Security = 2 years)
- [ ] Rate limiting active (100 req/min general, 5/min login)
- [ ] Account lockout after 5 failed attempts
- [ ] OTP verification enabled (10-min expiry, 5 max attempts)
- [ ] No hardcoded credentials in source
- [ ] Security headers: HSTS, X-Frame-Options, X-Content-Type-Options, etc.

## Database

- [ ] All 12 migrations applied cleanly
- [ ] Admin account created (email from ADMIN_EMAIL env var)
- [ ] Reseller test account seeded
- [ ] AuditLog TTL/index cleanup configured
- [ ] Database backup plan in place

## Performance

- [ ] Build produces 68 routes with 0 errors
- [ ] Static pages prerendered (home, login, dashboard pages)
- [ ] API routes are dynamic (server-rendered on demand)
- [ ] Static assets cached (Next.js built-in)

## Monitoring

- [ ] `/api/health` endpoint returns 200 OK
- [ ] Error monitoring via Railway logs
- [ ] Deploy notifications configured
- [ ] Database connection pool sized appropriately

## Rollback Plan

1. `railway rollback` — revert to previous deployment
2. Database: restore from pg_dump backup
3. Environment variables: restore from Railway Dashboard history

## Post-Deploy Verification

- [ ] Visit https://www.smartbdunlock.com — 200 OK
- [ ] Visit https://www.smartbdunlock.com/login — page loads
- [ ] Register a new account — OTP email sent
- [ ] Verify OTP — account goes to pending_approval
- [ ] Admin approves — user can login
- [ ] Admin dashboard loads all 10+ widget sections
- [ ] Reseller dashboard loads
- [ ] API health: GET /api/health — 200
- [ ] Build logs show no errors
