import { findNode, type SkillBlock, type SkillNode, type SkillPage } from "./skill-tree";
import { canEditPrograms } from "./program-edit";

export type SkillCopyPatch = { path: string; value: string };

const id = "[A-Za-z0-9_-]{1,80}";
const cardPath = new RegExp(`^n:(${id}):(card|map):(title|sub|foot)$`);
const simplePath = new RegExp(`^n:(${id}):(hint|crumb)$`);
const pagePath = new RegExp(`^n:(${id}):page:(title|blurb|eyebrow)$`);
const blockPath = new RegExp(`^n:(${id}):sec:([0-9]+(?:\\.[0-9]+)*):(title|sub|foot|strong|text|label)$`);
const listPath = new RegExp(`^n:(${id}):sec:([0-9]+(?:\\.[0-9]+)*):(item|chip):(\\d+)$`);

function invalid(path: string, message: string) {
  return { ok: false as const, message: "Check the fields and try again.", fieldErrors: { [path]: message } };
}

function lengthError(field: string, value: string) {
  const required = field === "title" || field === "crumb" || field === "strong" || field === "label" || field === "item" || field === "chip";
  const max = required ? 120 : 400;
  if (required && !value.trim()) return "Add the text.";
  if (value.trim().length > max) return "Use a shorter line.";
  return null;
}

function sectionAt(page: SkillPage, indexPath: string): SkillBlock | null {
  const indexes = indexPath.split(".").map((part) => Number(part));
  let sections: readonly SkillBlock[] = page.sections;
  let block: SkillBlock | undefined;
  for (let depth = 0; depth < indexes.length; depth += 1) {
    block = sections[indexes[depth] ?? -1];
    if (!block) return null;
    if (depth < indexes.length - 1) {
      if (block.type !== "group") return null;
      sections = block.sections;
    }
  }
  return block ?? null;
}

function setCardField(card: { title: string; sub?: string; foot?: string }, field: "title" | "sub" | "foot", value: string) {
  if (field === "title") {
    card.title = value.trim();
    return null;
  }
  if (typeof card[field] !== "string") return "That line is not on this card.";
  card[field] = value.trim();
  return null;
}

export function applySkillCopy(
  tree: SkillNode,
  patches: SkillCopyPatch[],
): { ok: true; tree: SkillNode } | { ok: false; message: string; fieldErrors: Record<string, string> } {
  if (!Array.isArray(patches) || patches.length > 200) return invalid("", "Check the fields and try again.");
  const next = JSON.parse(JSON.stringify(tree)) as SkillNode;
  const fieldErrors: Record<string, string> = {};
  for (const patch of patches) {
    const path = typeof patch?.path === "string" ? patch.path : "";
    const value = typeof patch?.value === "string" ? patch.value : "";
    const problem = applyOne(next, path, value);
    if (problem) fieldErrors[path || "tree"] = problem;
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Check the fields and try again.", fieldErrors };
  }
  return { ok: true, tree: next };
}

function applyOne(tree: SkillNode, path: string, value: string): string | null {
  const card = path.match(cardPath);
  if (card) {
    const node = findNode(card[1], tree);
    if (!node) return "That card is not on this map.";
    const face = card[2] === "map" ? node.map : node.card;
    if (!face) return "That card is not on this map.";
    const field = card[3] as "title" | "sub" | "foot";
    const length = lengthError(field, value);
    if (length) return length;
    return setCardField(face, field, value);
  }
  const simple = path.match(simplePath);
  if (simple) {
    const node = findNode(simple[1], tree);
    if (!node) return "That card is not on this map.";
    const field = simple[2] as "hint" | "crumb";
    const length = lengthError(field, value);
    if (length) return length;
    if (field === "hint") {
      if (typeof node.hint !== "string") return "That line is not on this page.";
      node.hint = value.trim();
      return null;
    }
    node.crumb = value.trim();
    return null;
  }
  const page = path.match(pagePath);
  if (page) {
    const node = findNode(page[1], tree);
    const field = page[2] as "title" | "blurb" | "eyebrow";
    if (!node?.page) return "That line is not on this page.";
    const length = lengthError(field, value);
    if (length) return length;
    if (field === "title") {
      node.page.title = value.trim();
      return null;
    }
    if (typeof node.page[field] !== "string") return "That line is not on this page.";
    node.page[field] = value.trim();
    return null;
  }
  const blockMatch = path.match(blockPath);
  if (blockMatch) {
    return setBlockField(tree, blockMatch[1], blockMatch[2], blockMatch[3], value);
  }
  const list = path.match(listPath);
  if (list) return setListItem(tree, list[1], list[2], list[3] as "item" | "chip", Number(list[4]), value);
  return "That line is not on this page.";
}

function setBlockField(tree: SkillNode, nodeId: string, indexPath: string, field: string, value: string) {
  const node = findNode(nodeId, tree);
  const block = node?.page ? sectionAt(node.page, indexPath) : null;
  if (!block) return "That line is not on this page.";
  const length = lengthError(field, value);
  if (length) return length;
  if (block.type === "note") {
    if (field !== "strong" && field !== "text") return "That line is not on this page.";
    block[field] = value.trim();
    return null;
  }
  if (field !== "title" && field !== "sub" && field !== "foot" && field !== "label") return "That line is not on this page.";
  if (field === "label") {
    if (block.type !== "cards" && block.type !== "group") return "That line is not on this page.";
    if (typeof block.label !== "string") return "That line is not on this page.";
    block.label = value.trim();
    return null;
  }
  if ((block.type === "panel" || block.type === "chips") && field === "title") {
    block.title = value.trim();
    return null;
  }
  if ((block.type === "panel" || block.type === "chips" || block.type === "cards") && (field === "sub" || field === "foot")) {
    if (field === "sub" && block.type !== "cards" && typeof block.sub === "string") {
      block.sub = value.trim();
      return null;
    }
    if (field === "foot" && typeof block.foot === "string") {
      block.foot = value.trim();
      return null;
    }
  }
  return "That line is not on this page.";
}

function setListItem(tree: SkillNode, nodeId: string, indexPath: string, kind: "item" | "chip", index: number, value: string) {
  const node = findNode(nodeId, tree);
  const block = node?.page ? sectionAt(node.page, indexPath) : null;
  const length = lengthError(kind, value);
  if (length) return length;
  if (kind === "item" && block?.type === "panel" && block.items && block.items[index] != null) {
    const items = [...block.items];
    items[index] = value.trim();
    block.items = items;
    return null;
  }
  if (kind === "chip" && block?.type === "chips" && block.chips[index]) {
    block.chips = block.chips.map((chip, chipIndex) => (chipIndex === index ? { ...chip, label: value.trim() } : chip));
    return null;
  }
  return "That line is not on this page.";
}

/** Drop a field once it matches the original so Save can turn off again. */
export function applySkillDraftChange(drafts: Record<string, string>, path: string, value: string, original: string) {
  const next = { ...drafts };
  if (value === original) delete next[path];
  else next[path] = value;
  return next;
}

export function commitSkillCopy(args: { role: string | null | undefined; tree: SkillNode; patches: unknown }) {
  if (!canEditPrograms(args.role)) {
    return { ok: false as const, message: "Only a Lead can save this.", fieldErrors: {} as Record<string, string> };
  }
  if (!Array.isArray(args.patches)) return invalid("tree", "Check the fields and try again.");
  const patches = args.patches.filter((item): item is SkillCopyPatch => {
    return Boolean(item) && typeof item === "object" && typeof (item as SkillCopyPatch).path === "string";
  });
  return applySkillCopy(args.tree, patches);
}
