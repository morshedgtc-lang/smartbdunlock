#!/bin/bash
# SmartBD Unlock - Startup script
# Handles failed migrations and applies pending ones

set -e

# Try migrate deploy
if ! npx prisma migrate deploy 2>&1; then
  echo "Migration deploy failed, attempting to resolve stuck migrations..."
  # Try to mark any stuck failed migration as rolled back
  npx prisma migrate resolve --rolled-back 20250720_add_system_setting_indexes 2>/dev/null || true
  npx prisma migrate resolve --rolled-back 20250720_add_email_verification_fields 2>/dev/null || true
  # Retry
  npx prisma migrate deploy
fi

# Start the app
next start -p $PORT
