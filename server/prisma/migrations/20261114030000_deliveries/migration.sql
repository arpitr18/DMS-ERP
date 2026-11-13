CREATE TABLE "Vehicle" (
 "id" TEXT PRIMARY KEY, "number" TEXT NOT NULL UNIQUE, "driverName" TEXT NOT NULL,
 "phone" TEXT, "capacityKg" DECIMAL(12,3), "active" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "DeliveryPlan" (
 "id" TEXT PRIMARY KEY, "vehicleId" TEXT NOT NULL REFERENCES "Vehicle"("id"),
 "scheduledDate" TIMESTAMP(3) NOT NULL, "status" TEXT NOT NULL DEFAULT 'PLANNED',
 "notes" TEXT, "snapshot" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3)
);
ALTER TABLE "Invoice" ADD COLUMN "deliveryPlanId" TEXT REFERENCES "DeliveryPlan"("id");
CREATE INDEX "Invoice_deliveryPlanId_idx" ON "Invoice"("deliveryPlanId");
