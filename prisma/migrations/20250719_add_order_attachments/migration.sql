-- Add OrderAttachment table for first-class file uploads on orders.
CREATE TABLE "OrderAttachment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "uploadedById" TEXT,
    "uploadedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderAttachment_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "OrderAttachment_orderId_idx" ON "OrderAttachment"("orderId");

-- Foreign key constraint (cascade delete to match Order relations)
ALTER TABLE "OrderAttachment"
    ADD CONSTRAINT "OrderAttachment_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
