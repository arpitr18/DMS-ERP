ALTER TABLE "Retailer"
ADD COLUMN "ownerName" TEXT, ADD COLUMN "building" TEXT, ADD COLUMN "street" TEXT,
ADD COLUMN "landmark" TEXT, ADD COLUMN "pincode" TEXT,
ADD COLUMN "latitude" DECIMAL(10,7), ADD COLUMN "longitude" DECIMAL(10,7);
ALTER TABLE "Salesman" ADD COLUMN "category" TEXT, ADD COLUMN "visitDays" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
-- Existing multi-beat assignments must be resolved explicitly before deployment.
CREATE UNIQUE INDEX "SalesmanBeat_salesmanId_key" ON "SalesmanBeat"("salesmanId");
