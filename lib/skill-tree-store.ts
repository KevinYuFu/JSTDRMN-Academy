/**
 * One Neon row holds the live skill tree.
 * Id is "current". The document is the SkillNode JSON.
 * An empty table is filled from the built-in map, once. Later saves are left alone.
 */

import { builtinSkillTree, parseSkillTree } from "./skill-tree-edit";
import type { SkillNode } from "./skill-tree";

export const SKILL_TREE_ROW_ID = "current";

export type SkillTreeStore = {
  skillTree: {
    findUnique(args: { where: { id: string } }): Promise<{ document: unknown } | null>;
    create(args: { data: { id: string; document: unknown } }): Promise<unknown>;
    upsert(args: {
      where: { id: string };
      create: { id: string; document: unknown };
      update: { document: unknown };
    }): Promise<unknown>;
  };
};

function isUniqueConflict(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === "P2002";
}

function plainDocument(tree: SkillNode): unknown {
  return JSON.parse(JSON.stringify(tree)) as unknown;
}

export async function ensureSkillTree(db: SkillTreeStore): Promise<{ tree: SkillNode; created: boolean }> {
  const row = await db.skillTree.findUnique({ where: { id: SKILL_TREE_ROW_ID } });
  if (row) {
    const tree = parseSkillTree(row.document);
    if (!tree) throw new Error("Saved skill tree is invalid.");
    return { tree, created: false };
  }
  const tree = builtinSkillTree();
  try {
    await db.skillTree.create({ data: { id: SKILL_TREE_ROW_ID, document: plainDocument(tree) } });
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
    const again = await db.skillTree.findUnique({ where: { id: SKILL_TREE_ROW_ID } });
    if (!again) throw error;
    const saved = parseSkillTree(again.document);
    if (!saved) throw new Error("Saved skill tree is invalid.");
    return { tree: saved, created: false };
  }
  return { tree, created: true };
}

async function database(): Promise<SkillTreeStore> {
  const { prisma } = await import("./db");
  return prisma as unknown as SkillTreeStore;
}

export async function loadSkillTree(db?: SkillTreeStore) {
  const client = db ?? (await database());
  return (await ensureSkillTree(client)).tree;
}

export async function saveSkillTree(tree: SkillNode, db?: SkillTreeStore) {
  const parsed = parseSkillTree(tree);
  if (!parsed) throw new Error("Skill tree is invalid.");
  const client = db ?? (await database());
  await client.skillTree.upsert({
    where: { id: SKILL_TREE_ROW_ID },
    create: { id: SKILL_TREE_ROW_ID, document: plainDocument(parsed) },
    update: { document: plainDocument(parsed) },
  });
  return parsed;
}
