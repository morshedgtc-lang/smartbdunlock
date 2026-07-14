#!/bin/bash
# SmartBD Unlock - Startup script
# Handles first deploy (db push + resolve) and subsequent deploys (migrate deploy)

set -e

# Try migrate deploy first (works for existing databases)
if ! npx prisma migrate deploy 2>/dev/null; then
  # First deploy: sync schema with db push, then mark initial migration as applied
  npx prisma db push --skip-generate
  npx prisma migrate resolve --applied 20250101000000_init
fi

# Start the app
next start -p $PORT
