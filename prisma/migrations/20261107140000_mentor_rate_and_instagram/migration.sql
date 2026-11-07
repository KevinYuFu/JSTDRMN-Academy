-- Nullable rate and Instagram fields. Null hides that part of the card.
-- Fill the four reviewed mentors only where the column is still null, so a later edit is kept.

ALTER TABLE "Mentor" ADD COLUMN "rateLabel" TEXT;
ALTER TABLE "Mentor" ADD COLUMN "instagramUrl" TEXT;
ALTER TABLE "Mentor" ADD COLUMN "instagramLabel" TEXT;

UPDATE "Mentor" SET "rateLabel" = 'CAD $60 / 1h' WHERE "id" = 'mnt_yuzu' AND "rateLabel" IS NULL;
UPDATE "Mentor" SET "instagramUrl" = 'https://www.instagram.com/yuzubops_official/' WHERE "id" = 'mnt_yuzu' AND "instagramUrl" IS NULL;
UPDATE "Mentor" SET "instagramLabel" = 'instagram.com/yuzubops_official' WHERE "id" = 'mnt_yuzu' AND "instagramLabel" IS NULL;

UPDATE "Mentor" SET "rateLabel" = 'CAD $60 / 1h' WHERE "id" = 'mnt_odin' AND "rateLabel" IS NULL;
UPDATE "Mentor" SET "instagramUrl" = 'https://www.instagram.com/odinsounds/' WHERE "id" = 'mnt_odin' AND "instagramUrl" IS NULL;
UPDATE "Mentor" SET "instagramLabel" = 'instagram.com/odinsounds' WHERE "id" = 'mnt_odin' AND "instagramLabel" IS NULL;

UPDATE "Mentor" SET "rateLabel" = 'CAD $60 / 1h' WHERE "id" = 'mnt_dawner' AND "rateLabel" IS NULL;
UPDATE "Mentor" SET "instagramUrl" = 'https://www.instagram.com/dawner.ca/' WHERE "id" = 'mnt_dawner' AND "instagramUrl" IS NULL;
UPDATE "Mentor" SET "instagramLabel" = 'instagram.com/dawner.ca' WHERE "id" = 'mnt_dawner' AND "instagramLabel" IS NULL;

UPDATE "Mentor" SET "rateLabel" = 'CAD $60 / 1h' WHERE "id" = 'mnt_vymvn' AND "rateLabel" IS NULL;
UPDATE "Mentor" SET "instagramUrl" = 'https://www.instagram.com/vymvn/' WHERE "id" = 'mnt_vymvn' AND "instagramUrl" IS NULL;
UPDATE "Mentor" SET "instagramLabel" = 'instagram.com/vymvn' WHERE "id" = 'mnt_vymvn' AND "instagramLabel" IS NULL;
