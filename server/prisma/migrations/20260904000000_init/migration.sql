-- Initial schema for Distribution Management
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'ADMIN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Product" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT,
  "basePrice" DECIMAL(12,2) NOT NULL,
  "defaultSellingRate" DECIMAL(12,2) NOT NULL,
  "mrp" DECIMAL(12,2) NOT NULL,
  "gstRate" DECIMAL(5,2) NOT NULL,
  "hsnCode" TEXT,
  "unit" TEXT NOT NULL DEFAULT 'PCS',
  "unitsPerCarton" INTEGER,
  "minStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

CREATE TABLE "Retailer" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "market" TEXT NOT NULL,
  "gstin" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "state" TEXT,
  "openingOutstanding" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "creditLimit" DECIMAL(12,2),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Retailer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Retailer_code_key" ON "Retailer"("code");

CREATE TABLE "RetailerProductPrice" (
  "id" TEXT NOT NULL,
  "retailerId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sellingRate" DECIMAL(12,2) NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RetailerProductPrice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RetailerProductPrice_retailerId_productId_key" ON "RetailerProductPrice"("retailerId", "productId");
CREATE INDEX "RetailerProductPrice_retailerId_idx" ON "RetailerProductPrice"("retailerId");
CREATE INDEX "RetailerProductPrice_productId_idx" ON "RetailerProductPrice"("productId");

CREATE TABLE "Purchase" (
  "id" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "supplierName" TEXT,
  "purchaseDate" TIMESTAMP(3) NOT NULL,
  "totalAmount" DECIMAL(14,2) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Purchase_purchaseDate_idx" ON "Purchase"("purchaseDate");

CREATE TABLE "PurchaseItem" (
  "id" TEXT NOT NULL,
  "purchaseId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "rate" DECIMAL(12,2) NOT NULL,
  "gstRate" DECIMAL(5,2) NOT NULL,
  "lineTotal" DECIMAL(14,2) NOT NULL,
  CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PurchaseItem_purchaseId_idx" ON "PurchaseItem"("purchaseId");
CREATE INDEX "PurchaseItem_productId_idx" ON "PurchaseItem"("productId");

CREATE TABLE "Invoice" (
  "id" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "retailerId" TEXT NOT NULL,
  "invoiceDate" TIMESTAMP(3) NOT NULL,
  "paymentMode" TEXT NOT NULL DEFAULT 'CREDIT',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "retailerNameSnapshot" TEXT NOT NULL,
  "retailerCodeSnapshot" TEXT NOT NULL,
  "retailerGstinSnapshot" TEXT,
  "retailerAddressSnapshot" TEXT,
  "retailerStateSnapshot" TEXT,
  "businessNameSnapshot" TEXT NOT NULL,
  "businessGstinSnapshot" TEXT,
  "businessAddressSnapshot" TEXT,
  "businessPhoneSnapshot" TEXT,
  "businessStateSnapshot" TEXT,
  "subtotal" DECIMAL(14,2) NOT NULL,
  "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "taxableAmount" DECIMAL(14,2) NOT NULL,
  "cgst" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "sgst" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "igst" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "roundOff" DECIMAL(8,2) NOT NULL DEFAULT 0,
  "grandTotal" DECIMAL(14,2) NOT NULL,
  "amountReceived" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "balanceDue" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE INDEX "Invoice_invoiceDate_idx" ON "Invoice"("invoiceDate");
CREATE INDEX "Invoice_retailerId_idx" ON "Invoice"("retailerId");

CREATE TABLE "InvoiceItem" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productCodeSnapshot" TEXT NOT NULL,
  "productNameSnapshot" TEXT NOT NULL,
  "hsnCodeSnapshot" TEXT,
  "quantity" DECIMAL(12,3) NOT NULL,
  "rate" DECIMAL(12,2) NOT NULL,
  "costRate" DECIMAL(12,2) NOT NULL,
  "mrpSnapshot" DECIMAL(12,2) NOT NULL,
  "gstRate" DECIMAL(5,2) NOT NULL,
  "taxableAmount" DECIMAL(14,2) NOT NULL,
  "taxAmount" DECIMAL(14,2) NOT NULL,
  "lineTotal" DECIMAL(14,2) NOT NULL,
  CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");
CREATE INDEX "InvoiceItem_productId_idx" ON "InvoiceItem"("productId");

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "retailerId" TEXT NOT NULL,
  "invoiceId" TEXT,
  "amount" DECIMAL(14,2) NOT NULL,
  "paymentDate" TIMESTAMP(3) NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'CASH',
  "reference" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Payment_retailerId_idx" ON "Payment"("retailerId");
CREATE INDEX "Payment_paymentDate_idx" ON "Payment"("paymentDate");

CREATE TABLE "InventoryTransaction" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "quantityChange" DECIMAL(12,3) NOT NULL,
  "unitCost" DECIMAL(12,2),
  "referenceType" TEXT,
  "referenceId" TEXT,
  "note" TEXT,
  "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InventoryTransaction_productId_idx" ON "InventoryTransaction"("productId");
CREATE INDEX "InventoryTransaction_transactionDate_idx" ON "InventoryTransaction"("transactionDate");

CREATE TABLE "ExpenseCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExpenseCategory_name_key" ON "ExpenseCategory"("name");

CREATE TABLE "Expense" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "expenseDate" TIMESTAMP(3) NOT NULL,
  "description" TEXT NOT NULL,
  "paymentMode" TEXT NOT NULL DEFAULT 'CASH',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Expense_expenseDate_idx" ON "Expense"("expenseDate");

CREATE TABLE "ImportLog" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "rowsReceived" INTEGER NOT NULL,
  "rowsImported" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RetailerProductPrice" ADD CONSTRAINT "RetailerProductPrice_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RetailerProductPrice" ADD CONSTRAINT "RetailerProductPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
