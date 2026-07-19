-- AlterTable: Add email verification fields to User
ALTER TABLE "User" ADD COLUMN "username" TEXT;
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "otpHash" TEXT;
ALTER TABLE "User" ADD COLUMN "otpExpire" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "otpAttempts" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex: Unique index on username
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex: Index on username for lookup performance
CREATE INDEX "User_username_idx" ON "User"("username");
