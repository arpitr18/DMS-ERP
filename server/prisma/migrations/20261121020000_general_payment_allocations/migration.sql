ALTER TABLE "Invoice" ADD COLUMN "generalPaymentApplied" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "Payment" ADD COLUMN "allocations" JSONB;
