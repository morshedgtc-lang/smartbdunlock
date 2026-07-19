# Backup & Restore Strategy

## Database Backup (PostgreSQL on Railway)

### Automated Backup (via Railway CLI + pg_dump)

```bash
# Daily backup
railway run --service postgres -- pg_dump -Fc -f /tmp/backup_$(date +%Y%m%d).dump

# Download backup
railway volumes get /tmp/backup_20260720.dump ./backups/
```

### Manual Backup via External Proxy

```bash
# Using the public TCP proxy
pg_dump -Fc \
  -h tokaido.proxy.rlwy.net \
  -p 27405 \
  -U postgres \
  -d railway \
  -f ./backups/smartbdunlock_$(date +%Y%m%d_%H%M%S).dump
```

### Backup via Railway Dashboard

1. Navigate to Railway Dashboard → Project → Postgres
2. Click "Backup" or use the "Export" feature
3. Download the snapshot

## Restore

```bash
# Restore from dump via external proxy
pg_restore -h tokaido.proxy.rlwy.net \
  -p 27405 \
  -U postgres \
  -d railway \
  --clean \
  --if-exists \
  ./backups/smartbdunlock_20260720.dump
```

### Restore via Railway CLI
```bash
railway run --service postgres -- pg_restore --clean --if-exists -d railway /tmp/backup.dump
```

## Backup Schedule

| Data | Frequency | Retention | Method |
|------|-----------|-----------|--------|
| Full database | Daily | 30 days | pg_dump -Fc |
| Prisma migrations | Per deploy | Permanent | Git history |
| Uploaded files | N/A | N/A | Stored as base64 in DB or imgbb — see note below |
| Environment vars | Per change | Permanent | .env.example + Railway Dashboard |

## File Storage Note

- `DepositRequest.screenshot` stores images as base64 data URLs in the database (already included in DB dump)
- Uploaded files via `/api/upload` use imgbb as external storage — these are NOT backed up locally
- File attachments are stored directly in the database

## Migration Safety

Before any `prisma migrate` operation in production:

```bash
# 1. Take a backup
pg_dump -Fc -h <host> -U postgres -d railway -f ./pre-migration-backup.dump

# 2. Apply migration
npx prisma migrate deploy

# 3. Verify
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;
```

## Disaster Recovery

If the database is corrupted or lost:

1. Create a new PostgreSQL service on Railway
2. Get the new DATABASE_URL
3. Set DATABASE_URL on the app service
4. `npx prisma migrate deploy` (re-creates schema if no dump available)
5. If dump exists: `pg_restore --clean --if-exists -d <DATABASE_URL> backup.dump`
6. If no dump: run `npx tsx prisma/seed.ts` to seed admin/reseller
7. Redeploy the app service
