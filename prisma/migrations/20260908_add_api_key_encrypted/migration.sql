-- Add encrypted API key copy so resellers can re-view their key later.
-- Idempotent by design: safe to run if the column already exists.
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "keyEncrypted" TEXT;