-- AlterTable
ALTER TABLE "Course" ADD COLUMN "delivery" TEXT NOT NULL DEFAULT 'on_demand';

-- AlterTable
ALTER TABLE "Course" ADD COLUMN "setting" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Course" ADD COLUMN "planCourseId" TEXT;

-- Existing cohort rows are live classes. New columns only; other fields stay as they are.
UPDATE "Course" SET "delivery" = 'live' WHERE "access" = 'cohort';

-- DJ Bootcamp is in person at Lynx Music. Fill a blank setting only.
UPDATE "Course" SET "setting" = 'in_person' WHERE "slug" = 'dj-bootcamp' AND "setting" = '';

-- Live classes are paid monthly-style. Move the original application billing, and leave any other billing alone.
UPDATE "Course" SET "billing" = 'monthly' WHERE "slug" = 'dj-bootcamp' AND "billing" = 'application';

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_planCourseId_fkey" FOREIGN KEY ("planCourseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
