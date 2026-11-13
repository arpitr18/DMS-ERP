CREATE TABLE "Beat" (
  "id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL UNIQUE,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
INSERT INTO "Beat" ("id", "name", "updatedAt")
SELECT md5('legacy-beat-' || "market"), "market", CURRENT_TIMESTAMP FROM "Retailer" GROUP BY "market";
ALTER TABLE "Retailer" ADD CONSTRAINT "Retailer_market_fkey" FOREIGN KEY ("market") REFERENCES "Beat"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "Salesman" (
  "id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "phone" TEXT, "email" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "SalesmanBeat" (
  "salesmanId" TEXT NOT NULL REFERENCES "Salesman"("id") ON DELETE CASCADE,
  "beatId" TEXT NOT NULL REFERENCES "Beat"("id") ON DELETE RESTRICT,
  PRIMARY KEY ("salesmanId", "beatId")
);
