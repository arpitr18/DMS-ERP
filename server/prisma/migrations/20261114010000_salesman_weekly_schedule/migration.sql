DROP INDEX IF EXISTS "SalesmanBeat_salesmanId_key";
CREATE TABLE "SalesmanVisit" (
  "salesmanId" TEXT NOT NULL REFERENCES "Salesman"("id") ON DELETE CASCADE,
  "day" TEXT NOT NULL CHECK ("day" IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  "beatId" TEXT NOT NULL REFERENCES "Beat"("id") ON DELETE RESTRICT,
  PRIMARY KEY ("salesmanId", "day")
);
CREATE INDEX "SalesmanVisit_beatId_idx" ON "SalesmanVisit"("beatId");
INSERT INTO "SalesmanVisit" ("salesmanId", "day", "beatId")
SELECT DISTINCT s."id", d.day, b."beatId" FROM "Salesman" s
JOIN "SalesmanBeat" b ON b."salesmanId"=s."id"
CROSS JOIN LATERAL unnest(s."visitDays") d(day)
WHERE d.day IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday');
