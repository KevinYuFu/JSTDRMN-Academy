/**
 * One Neon row holds the live skill tree.
 * Id is "current". The document is the SkillNode JSON.
 * An empty table is filled from the built-in map, once. Later saves are left alone.
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import { builtinSkillTree, parseSkillTree } from "./skill-tree-edit";
import type { SkillNode } from "./skill-tree";
import previousDefault from "./skill-tree-previous-default.json";

export const SKILL_TREE_ROW_ID = "current";

export type SkillTreeStore = {
  skillTree: {
    findUnique(args: { where: { id: string } }): Promise<{ document: unknown } | null>;
    create(args: { data: { id: string; document: Prisma.InputJsonValue } }): Promise<unknown>;
    upsert(args: {
      where: { id: string };
      create: { id: string; document: Prisma.InputJsonValue };
      update: { document: Prisma.InputJsonValue };
    }): Promise<unknown>;
  };
};

export function skillTreeClient(client: Pick<PrismaClient, "skillTree">): SkillTreeStore {
  return {
    skillTree: {
      findUnique: (args) => client.skillTree.findUnique({ where: args.where }),
      create: (args) => client.skillTree.create({ data: args.data }),
      upsert: (args) => client.skillTree.upsert({ where: args.where, create: args.create, update: args.update }),
    },
  };
}

function isUniqueConflict(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === "P2002";
}

function plainDocument(tree: SkillNode): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(tree)) as Prisma.InputJsonValue;
}

/**
 * The untouched previous built-in map is shown as the current built-in map.
 * The row is not written. A document that differs anywhere, including one
 * title, stays as it was saved.
 */
function isUntouchedPreviousDefault(tree: SkillNode) {
  const previous = parseSkillTree(previousDefault);
  if (!previous) return false;
  return JSON.stringify(tree) === JSON.stringify(previous);
}

/** Read only. A missing row is null. This never inserts. */
export async function readSkillTree(db: SkillTreeStore): Promise<SkillNode | null> {
  const row = await db.skillTree.findUnique({ where: { id: SKILL_TREE_ROW_ID } });
  if (!row) return null;
  const tree = parseSkillTree(row.document);
  if (!tree) throw new Error("Saved skill tree is invalid.");
  if (isUntouchedPreviousDefault(tree)) return builtinSkillTree();
  return tree;
}

export async function ensureSkillTree(db: SkillTreeStore): Promise<{ tree: SkillNode; created: boolean }> {
  const existing = await readSkillTree(db);
  if (existing) return { tree: existing, created: false };
  const tree = builtinSkillTree();
  try {
    await db.skillTree.create({ data: { id: SKILL_TREE_ROW_ID, document: plainDocument(tree) } });
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
    const saved = await readSkillTree(db);
    if (!saved) throw error;
    return { tree: saved, created: false };
  }
  return { tree, created: true };
}

/** The row a save will rewrite. Reads the store it is given, never a cache. */
export async function loadSkillTreeForWrite(db: SkillTreeStore) {
  return (await ensureSkillTree(db)).tree;
}

export async function writeSkillTree(tree: SkillNode, db: SkillTreeStore) {
  const parsed = parseSkillTree(tree);
  if (!parsed) throw new Error("Skill tree is invalid.");
  await db.skillTree.upsert({
    where: { id: SKILL_TREE_ROW_ID },
    create: { id: SKILL_TREE_ROW_ID, document: plainDocument(parsed) },
    update: { document: plainDocument(parsed) },
  });
  return parsed;
}
