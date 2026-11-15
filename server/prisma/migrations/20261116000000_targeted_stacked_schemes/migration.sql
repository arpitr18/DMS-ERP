ALTER TABLE "Product" ADD COLUMN "brand" TEXT NOT NULL DEFAULT 'Haldiram';
ALTER TABLE "Retailer" ADD COLUMN "channel" TEXT, ADD COLUMN "subchannel" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "salesmanId" TEXT, ADD COLUMN "salesmanNameSnapshot" TEXT,
 ADD COLUMN "regularBeatOrder" BOOLEAN, ADD COLUMN "bookingRemark" TEXT,
 ADD COLUMN "additionalDiscountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "InvoiceItem" ADD COLUMN "appliedSchemes" JSONB;
ALTER TABLE "ProductScheme" ALTER COLUMN "productId" DROP NOT NULL;
ALTER TABLE "ProductScheme" ADD COLUMN "code" TEXT, ADD COLUMN "targetType" TEXT NOT NULL DEFAULT 'PRODUCT',
 ADD COLUMN "brand" TEXT, ADD COLUMN "channel" TEXT, ADD COLUMN "subchannel" TEXT,
 ADD COLUMN "retailerId" TEXT REFERENCES "Retailer"("id"), ADD COLUMN "beatId" TEXT REFERENCES "Beat"("id");
WITH numbered AS (SELECT "id", 'S'||to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata','MMYY') AS prefix,
 row_number() OVER (PARTITION BY to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata','MMYY') ORDER BY "createdAt","id") AS serial FROM "ProductScheme")
UPDATE "ProductScheme" s SET "code"=n.prefix||'-'||lpad(n.serial::text,4,'0') FROM numbered n WHERE n."id"=s."id";
ALTER TABLE "ProductScheme" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "ProductScheme_code_key" ON "ProductScheme"("code");
