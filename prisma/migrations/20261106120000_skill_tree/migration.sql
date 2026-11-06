-- Skill tree content lives in one JSON document.
-- The app copies the built-in map into this table when the row is missing.
-- This migration only adds a table. It does not delete or change other rows.

-- CreateTable
CREATE TABLE "SkillTree" (
    "id" TEXT NOT NULL,
    "document" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillTree_pkey" PRIMARY KEY ("id")
);
