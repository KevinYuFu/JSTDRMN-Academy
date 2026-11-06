-- Roles are student, mentor, instructor, and lead.
-- teacher and admin were the old full-access roles (Yu, and the allow-list).
-- Map both to lead so they keep that access.
-- Instructor is for class teachers. Mentor is for one-on-ones.
-- This updates the role text only. No rows are deleted.
UPDATE "User"
SET "role" = 'lead'
WHERE "role" IN ('teacher', 'admin');
