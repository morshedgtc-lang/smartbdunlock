-- CreateTable
CREATE TABLE "DepositRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "transactionId" TEXT,
    "screenshot" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "adminNote" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepositRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierJob" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "externalOrderId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "requestPayload" TEXT,
    "responsePayload" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkOrderBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "totalRecords" INTEGER NOT NULL,
    "successfulRecords" INTEGER NOT NULL DEFAULT 0,
    "failedRecords" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BulkOrderBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DepositRequest_userId_status_idx" ON "DepositRequest"("userId", "status");

-- CreateIndex
CREATE INDEX "DepositRequest_status_idx" ON "DepositRequest"("status");

-- CreateIndex
CREATE INDEX "DepositRequest_createdAt_idx" ON "DepositRequest"("createdAt");

-- CreateIndex
CREATE INDEX "SupplierJob_orderId_idx" ON "SupplierJob"("orderId");

-- CreateIndex
CREATE INDEX "SupplierJob_supplierId_idx" ON "SupplierJob"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierJob_status_idx" ON "SupplierJob"("status");

-- CreateIndex
CREATE INDEX "SupplierJob_createdAt_idx" ON "SupplierJob"("createdAt");

-- CreateIndex
CREATE INDEX "BulkOrderBatch_userId_idx" ON "BulkOrderBatch"("userId");

-- CreateIndex
CREATE INDEX "BulkOrderBatch_status_idx" ON "BulkOrderBatch"("status");

-- CreateIndex
CREATE INDEX "BulkOrderBatch_createdAt_idx" ON "BulkOrderBatch"("createdAt");

-- AddForeignKey
ALTER TABLE "DepositRequest" ADD CONSTRAINT "DepositRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierJob" ADD CONSTRAINT "SupplierJob_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierJob" ADD CONSTRAINT "SupplierJob_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkOrderBatch" ADD CONSTRAINT "BulkOrderBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkOrderBatch" ADD CONSTRAINT "BulkOrderBatch_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
