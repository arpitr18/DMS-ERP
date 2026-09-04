CREATE TABLE "BusinessSetting" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "businessName" TEXT NOT NULL,
  "gstin" TEXT,
  "address" TEXT,
  "phone" TEXT,
  "state" TEXT,
  "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BusinessSetting_pkey" PRIMARY KEY ("id")
);
