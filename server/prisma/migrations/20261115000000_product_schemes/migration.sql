CREATE TABLE "ProductScheme" (
 "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL,
 "productId" TEXT NOT NULL REFERENCES "Product"("id"),
 "discountPercent" DECIMAL(5,2) NOT NULL CHECK ("discountPercent">0 AND "discountPercent"<=100),
 "startDate" DATE NOT NULL, "endDate" DATE NOT NULL,
 "cancelledAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK ("endDate">="startDate")
);
CREATE INDEX "ProductScheme_productId_startDate_endDate_idx" ON "ProductScheme"("productId","startDate","endDate");
ALTER TABLE "Invoice" ADD COLUMN "schemeDiscount" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "InvoiceItem" ADD COLUMN "schemeIdSnapshot" TEXT, ADD COLUMN "schemeNameSnapshot" TEXT,
 ADD COLUMN "schemePercent" DECIMAL(5,2) NOT NULL DEFAULT 0, ADD COLUMN "schemeDiscount" DECIMAL(14,2) NOT NULL DEFAULT 0;
