-- FB2B is a one-time $500 payment. Only fill a row that still has no price.
UPDATE "Course"
SET "billing" = 'once',
    "priceCents" = 50000,
    "statusLabel" = ''
WHERE "id" = 'crs_fb2b'
  AND "priceCents" IS NULL;
