-- AlterTable: ApiKey
ALTER TABLE "ApiKey" ADD COLUMN "totalRequests" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Order
ALTER TABLE "Order" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE "Order" ADD COLUMN "assignedTo" TEXT;
ALTER TABLE "Order" ADD COLUMN "internalNotes" TEXT;

-- CreateTable: OrderNote
CREATE TABLE "OrderNote" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderNote_orderId_idx" ON "OrderNote"("orderId");
CREATE INDEX "OrderNote_authorId_idx" ON "OrderNote"("authorId");
CREATE INDEX "Order_assignedTo_idx" ON "Order"("assignedTo");
CREATE INDEX "Order_priority_idx" ON "Order"("priority");

-- AddForeignKey
ALTER TABLE "OrderNote" ADD CONSTRAINT "OrderNote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
