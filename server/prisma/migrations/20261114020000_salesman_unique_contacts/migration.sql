-- Resolve duplicate contacts before applying this migration. No records are deleted.
BEGIN;
CREATE FUNCTION normalize_salesman_phone(value TEXT) RETURNS TEXT
LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE WHEN length(digits)=12 AND left(digits,2)='91' THEN substr(digits,3) ELSE digits END
  FROM (SELECT ltrim(regexp_replace(coalesce(value,''),'[^0-9]','','g'),'0') AS digits) normalized;
$$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Salesman" WHERE normalize_salesman_phone("phone")<>'' GROUP BY normalize_salesman_phone("phone") HAVING count(*)>1)
    OR EXISTS (SELECT 1 FROM "Salesman" WHERE trim(coalesce("email",''))<>'' GROUP BY lower(trim("email")) HAVING count(*)>1) THEN
    RAISE EXCEPTION 'Duplicate salesman contacts exist. Resolve them before applying contact uniqueness.';
  END IF;
END $$;
UPDATE "Salesman" SET "phone"=nullif(normalize_salesman_phone("phone"),''), "email"=nullif(lower(trim("email")),'');
CREATE UNIQUE INDEX "Salesman_phone_key" ON "Salesman"("phone");
CREATE UNIQUE INDEX "Salesman_email_key" ON "Salesman"("email");
ALTER TABLE "Salesman" ADD CONSTRAINT "Salesman_phone_normalized" CHECK ("phone" IS NULL OR "phone"=normalize_salesman_phone("phone"));
ALTER TABLE "Salesman" ADD CONSTRAINT "Salesman_email_normalized" CHECK ("email" IS NULL OR "email"=lower(trim("email")));
COMMIT;
