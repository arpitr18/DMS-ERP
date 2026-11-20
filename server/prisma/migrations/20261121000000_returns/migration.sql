CREATE TABLE "ReturnRecord" (
 "id" TEXT NOT NULL PRIMARY KEY, "retailerId" TEXT NOT NULL REFERENCES "Retailer"("id"),
 "retailerName" TEXT NOT NULL, "invoiceId" TEXT REFERENCES "Invoice"("id"), "invoiceNumber" TEXT,
 "type" TEXT NOT NULL, "returnDate" TIMESTAMP(3) NOT NULL, "reason" TEXT NOT NULL,
 "amount" DECIMAL(14,2) NOT NULL, "items" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ReturnRecord_invoiceId_idx" ON "ReturnRecord"("invoiceId");
CREATE INDEX "ReturnRecord_retailerId_idx" ON "ReturnRecord"("retailerId");
