-- AlterTable: Supplier
ALTER TABLE "Supplier" ADD COLUMN "apiKeyEncrypted" TEXT,
ADD COLUMN "ipAddress" TEXT,
ADD COLUMN "syncInterval" INTEGER DEFAULT 10,
ADD COLUMN "lastSyncAt" TIMESTAMP(3);

-- AlterTable: Service
ALTER TABLE "Service" ADD COLUMN "profitType" TEXT NOT NULL DEFAULT 'fixed',
ADD COLUMN "profitValue" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable: SupplierService
CREATE TABLE "SupplierService" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "supplierServiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "supplierCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "deliveryTime" TEXT,
    "requiredInputs" TEXT,
    "rawData" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "websiteServiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierService_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PricingRule
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "category" TEXT,
    "providerId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SyncHistory
CREATE TABLE "SyncHistory" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "totalImported" INTEGER NOT NULL DEFAULT 0,
    "newServices" INTEGER NOT NULL DEFAULT 0,
    "updatedServices" INTEGER NOT NULL DEFAULT 0,
    "failedServices" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'success',
    "error" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SupplierApiLog
CREATE TABLE "SupplierApiLog" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "requestTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responseTime" TIMESTAMP(3),
    "statusCode" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierApiLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: SupplierService
CREATE UNIQUE INDEX "SupplierService_providerId_supplierServiceId_key" ON "SupplierService"("providerId", "supplierServiceId");
CREATE UNIQUE INDEX "SupplierService_websiteServiceId_key" ON "SupplierService"("websiteServiceId");
CREATE INDEX "SupplierService_providerId_status_idx" ON "SupplierService"("providerId", "status");
CREATE INDEX "SupplierService_supplierServiceId_idx" ON "SupplierService"("supplierServiceId");

-- CreateIndex: PricingRule
CREATE INDEX "PricingRule_type_active_idx" ON "PricingRule"("type", "active");
CREATE INDEX "PricingRule_category_idx" ON "PricingRule"("category");
CREATE INDEX "PricingRule_providerId_idx" ON "PricingRule"("providerId");

-- CreateIndex: SyncHistory
CREATE INDEX "SyncHistory_providerId_createdAt_idx" ON "SyncHistory"("providerId", "createdAt");

-- CreateIndex: SupplierApiLog
CREATE INDEX "SupplierApiLog_providerId_createdAt_idx" ON "SupplierApiLog"("providerId", "createdAt");
CREATE INDEX "SupplierApiLog_success_createdAt_idx" ON "SupplierApiLog"("success", "createdAt");

-- AddForeignKey: SupplierService -> Supplier
ALTER TABLE "SupplierService" ADD CONSTRAINT "SupplierService_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: PricingRule -> Supplier
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: SyncHistory -> Supplier
ALTER TABLE "SyncHistory" ADD CONSTRAINT "SyncHistory_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: SupplierApiLog -> Supplier
ALTER TABLE "SupplierApiLog" ADD CONSTRAINT "SupplierApiLog_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: SupplierService -> Service (website link)
ALTER TABLE "SupplierService" ADD CONSTRAINT "SupplierService_websiteServiceId_fkey" FOREIGN KEY ("websiteServiceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
