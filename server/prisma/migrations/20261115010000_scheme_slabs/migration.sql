ALTER TABLE "ProductScheme" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'PERCENT',
 ADD COLUMN "quantityUnit" TEXT NOT NULL DEFAULT 'BILLING_UNIT',
 ADD COLUMN "slabs" JSONB NOT NULL DEFAULT '[]',
 ADD COLUMN "repeatBenefit" BOOLEAN NOT NULL DEFAULT false;
UPDATE "ProductScheme" SET "slabs"=jsonb_build_array(jsonb_build_object('minimumQuantity',0,'value',"discountPercent"));
ALTER TABLE "ProductScheme" DROP CONSTRAINT "ProductScheme_discountPercent_check";
ALTER TABLE "ProductScheme" ADD CONSTRAINT "ProductScheme_discountPercent_check" CHECK("discountPercent">=0 AND "discountPercent"<=100);
ALTER TABLE "InvoiceItem" ADD COLUMN "freeQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
 ADD COLUMN "schemeTypeSnapshot" TEXT, ADD COLUMN "unitSnapshot" TEXT;
