"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireLead } from "@/lib/auth";
import {
  addChildNode,
  applyNodePatch,
  draftFromFields,
  moveNode,
  removeNode,
  reparentNode,
  type NodeDraft,
} from "@/lib/skill-tree-edit";
import { findNode } from "@/lib/skill-tree";
import { loadSkillTree, saveSkillTree } from "@/lib/skill-tree-store";

const DRAFT_KEYS = ["cardTitle", "crumb", "pageTitle", "cardSub", "mapSub", "blurb", "hint", "slug", "shortcut"] as const;

function refresh() {
  revalidatePath("/skill-tree", "layout");
  revalidatePath("/teacher/skill-tree");
  revalidatePath("/teacher");
}

function back(id: string, query: Record<string, string>): never {
  const params = new URLSearchParams({ node: id, ...query });
  redirect(`/teacher/skill-tree?${params.toString()}`);
}

function readId(formData: FormData, key: string) {
  const id = String(formData.get(key) ?? "");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) return null;
  return id;
}

export async function saveSkillNode(formData: FormData) {
  await requireLead();
  const id = readId(formData, "id");
  if (!id) redirect("/teacher/skill-tree?error=invalid");
  const tree = await loadSkillTree();
  const node = findNode(id, tree);
  if (!node) back(tree.id, { error: "missing" });
  const fields: Partial<NodeDraft> = {};
  for (const key of DRAFT_KEYS) {
    if (formData.has(key)) fields[key] = String(formData.get(key) ?? "");
  }
  const result = applyNodePatch(tree, id, draftFromFields(node, fields));
  if (!result.ok) back(id, { error: result.reason });
  await saveSkillTree(result.tree);
  refresh();
  back(result.focusId, { saved: "saved" });
}

export async function addSkillChild(formData: FormData) {
  await requireLead();
  const id = readId(formData, "id");
  if (!id) redirect("/teacher/skill-tree?error=invalid");
  const tree = await loadSkillTree();
  const result = addChildNode(tree, id, {
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    blurb: String(formData.get("blurb") ?? ""),
  });
  if (!result.ok) back(id, { error: result.reason });
  await saveSkillTree(result.tree);
  refresh();
  back(result.focusId, { saved: "added" });
}

export async function removeSkillNode(formData: FormData) {
  await requireLead();
  const id = readId(formData, "id");
  if (!id) redirect("/teacher/skill-tree?error=invalid");
  const tree = await loadSkillTree();
  const result = removeNode(tree, id);
  if (!result.ok) back(id, { error: result.reason });
  await saveSkillTree(result.tree);
  refresh();
  back(result.focusId, { saved: "removed" });
}

export async function reorderSkillNode(formData: FormData) {
  await requireLead();
  const id = readId(formData, "id");
  if (!id) redirect("/teacher/skill-tree?error=invalid");
  const direction = String(formData.get("direction") ?? "");
  if (direction !== "up" && direction !== "down") back(id, { error: "invalid" });
  const tree = await loadSkillTree();
  const result = moveNode(tree, id, direction);
  if (!result.ok) back(id, { error: result.reason });
  await saveSkillTree(result.tree);
  refresh();
  back(result.focusId, { saved: "order" });
}

export async function moveSkillNode(formData: FormData) {
  await requireLead();
  const id = readId(formData, "id");
  const parentId = readId(formData, "parentId");
  if (!id || !parentId) redirect("/teacher/skill-tree?error=invalid");
  const tree = await loadSkillTree();
  const result = reparentNode(tree, id, parentId);
  if (!result.ok) back(id, { error: result.reason });
  await saveSkillTree(result.tree);
  refresh();
  back(result.focusId, { saved: "moved" });
}
