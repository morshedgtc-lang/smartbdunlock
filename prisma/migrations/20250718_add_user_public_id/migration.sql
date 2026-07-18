-- Add public userId column (format SBD100001)
ALTER TABLE "User" ADD COLUMN "userId" TEXT;

-- Backfill existing users with sequential public IDs.
-- Uses a deterministic row_number ordered by createdAt then id so the
-- result is stable and collision-free. Existing numeric suffix starts at 100000.
UPDATE "User"
SET "userId" = 'SBD' || LPAD((100000 + row_num)::TEXT, 6, '0')
FROM (
  SELECT
    "id",
    ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS row_num
  FROM "User"
  WHERE "userId" IS NULL
) AS numbered
WHERE "User"."id" = numbered."id";

-- Enforce NOT NULL and uniqueness
ALTER TABLE "User" ALTER COLUMN "userId" SET NOT NULL;
CREATE UNIQUE INDEX "User_userId_key" ON "User"("userId");
