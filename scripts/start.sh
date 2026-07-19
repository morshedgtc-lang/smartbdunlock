#!/bin/bash
# SmartBD Unlock - Startup script
# Handles first deploy (db push + resolve) and subsequent deploys (migrate deploy)

set -e

# Try migrate deploy first (works for existing databases)
npx prisma migrate deploy

# Start the app
next start -p $PORT
