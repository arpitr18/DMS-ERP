ALTER TABLE "Invoice" ADD COLUMN "creditApplied" DECIMAL(14,2) NOT NULL DEFAULT 0;
CREATE TABLE "RetailerCredit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "retailerId" TEXT NOT NULL REFERENCES "Retailer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "amount" DECIMAL(14,2) NOT NULL CHECK ("amount" > 0),
  "reason" TEXT NOT NULL,
  "notes" TEXT NOT NULL,
  "creditDate" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "RetailerCredit_retailerId_idx" ON "RetailerCredit"("retailerId");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_creditApplied_check" CHECK ("creditApplied" >= 0 AND "creditApplied" <= "grandTotal");
