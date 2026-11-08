/**
 * Edits for the live skill tree.
 * The public page and the Lead editor both use the same SkillNode shape.
 * A change is kept only when the whole tree still matches that shape.
 */

import { isLead } from "./roles";
import {
  findNode,
  skillTree,
  type SkillBlock,
  type SkillCard,
  type SkillCardsBlock,
  type SkillChipBlock,
  type SkillGroupBlock,
  type SkillNode,
  type SkillNoteBlock,
  type SkillPage,
  type SkillPanelBlock,
  type SkillPath,
  type SkillPathEdge,
} from "./skill-tree";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_NODES = 400;
const MAX_DEPTH = 12;

export type SkillTreeEditReason = "title" | "crumb" | "slug" | "shortcut" | "root" | "cycle" | "missing" | "invalid";

export type SkillTreeEditResult = { ok: true; tree: SkillNode; focusId: string } | { ok: false; reason: SkillTreeEditReason };

export type NodeDraft = {
  cardTitle: string;
  crumb: string;
  pageTitle: string;
  cardSub: string;
  mapSub: string;
  blurb: string;
  hint: string;
  slug: string;
  shortcut: string;
};

export type NewNodeInput = {
  title: string;
  slug: string;
  blurb: string;
};

export const skillTreeSavedCopy: Record<string, string> = {
  saved: "Saved. The public Skill Tree shows this now.",
  order: "Order saved. The public Skill Tree shows this now.",
  moved: "Moved. The public Skill Tree shows this now.",
  added: "Added. The public Skill Tree shows this now.",
  removed: "Removed. The public Skill Tree shows this now.",
};

export const skillTreeErrorCopy: Record<string, string> = {
  title: "Add a title.",
  crumb: "Add the short name in the path.",
  slug: "Use a lowercase slug. A sibling already has this one.",
  shortcut: "That overview shortcut is already used.",
  root: "The overview stays where it is.",
  cycle: "A node cannot move under itself.",
  missing: "That node is not in the tree.",
  invalid: "That change did not save.",
  forbidden: "Only a Lead can edit the skill tree.",
};

/** Lead, including the older teacher and admin words. */
export function canEditSkillTree(role: string | null | undefined) {
  return isLead(role);
}

export function draftFromNode(node: SkillNode): NodeDraft {
  return {
    cardTitle: node.card.title,
    crumb: node.crumb,
    pageTitle: node.page?.title ?? "",
    cardSub: node.card.sub ?? "",
    mapSub: node.map?.sub ?? "",
    blurb: node.page?.blurb ?? "",
    hint: node.hint ?? "",
    slug: node.slug.join("/"),
    shortcut: node.fromOverview?.join("/") ?? "",
  };
}

export function draftFromFields(node: SkillNode, fields: Partial<NodeDraft>): NodeDraft {
  const draft = draftFromNode(node);
  (Object.keys(fields) as (keyof NodeDraft)[]).forEach((key) => {
    const value = fields[key];
    if (value !== undefined) draft[key] = value;
  });
  return draft;
}

export function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "node";
}

/** Turns "skill/daw" or "Skill / DAW" into URL pieces. Blank means no slug yet. */
export function parseSlugInput(input: string): string[] | null {
  const trimmed = input.trim().replace(/^\/+|\/+$/g, "");
  if (!trimmed) return [];
  const raw = trimmed.split("/");
  if (raw.some((part) => part.trim() === "")) return null;
  if (raw.length > 4) return null;
  const parts = raw.map((part) => slugify(part));
  if (parts.some((part) => !SLUG.test(part))) return null;
  return parts;
}

export function nodeCount(node: SkillNode): number {
  return 1 + node.children.reduce((sum, child) => sum + nodeCount(child), 0);
}

export function findParent(tree: SkillNode, id: string): SkillNode | null {
  for (const child of tree.children) {
    if (child.id === id) return tree;
    const nested = findParent(child, id);
    if (nested) return nested;
  }
  return null;
}

export type TreeListItem = {
  id: string;
  title: string;
  slug: string;
  depth: number;
  canUp: boolean;
  canDown: boolean;
};

export function treeList(tree: SkillNode): TreeListItem[] {
  const rows: TreeListItem[] = [];
  function walk(node: SkillNode, depth: number, index: number, count: number) {
    rows.push({
      id: node.id,
      title: node.card.title,
      slug: node.slug.join("/"),
      depth,
      canUp: depth > 0 && index > 0,
      canDown: depth > 0 && index < count - 1,
    });
    node.children.forEach((child, childIndex) => walk(child, depth + 1, childIndex, node.children.length));
  }
  walk(tree, 0, 0, 1);
  return rows;
}

export function parentOptions(tree: SkillNode, id: string): { id: string; label: string }[] {
  const node = findNode(id, tree);
  if (!node || node.id === tree.id) return [];
  const blocked = new Set<string>();
  function block(current: SkillNode) {
    blocked.add(current.id);
    current.children.forEach(block);
  }
  block(node);
  const options: { id: string; label: string }[] = [];
  function walk(current: SkillNode, label: string) {
    if (blocked.has(current.id)) return;
    options.push({ id: current.id, label });
    for (const child of current.children) {
      walk(child, `${label} / ${child.card.title}`);
    }
  }
  walk(tree, tree.card.title);
  return options;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function readString(value: unknown, max: number, required: boolean): string | undefined | null {
  if (value == null) return required ? null : undefined;
  if (typeof value !== "string") return null;
  if (value.length === 0) return required ? null : undefined;
  if (value.length > max) return null;
  return value;
}

function readBool(value: unknown): boolean | undefined | null {
  if (value == null) return undefined;
  if (typeof value !== "boolean") return null;
  return value;
}

function readSlug(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 4) return null;
  const parts: string[] = [];
  for (const part of value) {
    if (typeof part !== "string" || part.length > 48 || !SLUG.test(part)) return null;
    parts.push(part);
  }
  return parts;
}

function readStrings(value: unknown, itemMax: number, listMax: number): string[] | undefined | null {
  if (value == null) return undefined;
  if (!Array.isArray(value) || value.length > listMax) return null;
  const items: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || item.length === 0 || item.length > itemMax) return null;
    items.push(item);
  }
  return items;
}

function readWidth(value: unknown): "narrow" | "core" | "hub" | undefined | null {
  if (value == null) return undefined;
  if (value === "narrow" || value === "core" || value === "hub") return value;
  return null;
}

function readCard(value: unknown): SkillCard | null {
  if (!isRecord(value) || !exactKeys(value, ["title", "sub", "foot", "accent", "label"])) return null;
  const title = readString(value.title, 160, true);
  const sub = readString(value.sub, 400, false);
  const foot = readString(value.foot, 160, false);
  const accent = readBool(value.accent);
  const label = readString(value.label, 160, false);
  if (!title || sub === null || foot === null || accent === null || label === null) return null;
  const card: SkillCard = { title };
  if (sub) card.sub = sub;
  if (foot) card.foot = foot;
  if (typeof accent === "boolean") card.accent = accent;
  if (label) card.label = label;
  return card;
}

function readBlock(value: unknown, depth: number): SkillBlock | null {
  if (!isRecord(value) || depth > 8 || typeof value.type !== "string") return null;
  if (value.type === "panel") {
    if (!exactKeys(value, ["type", "title", "sub", "foot", "accent", "items"])) return null;
    const title = readString(value.title, 160, true);
    const sub = readString(value.sub, 600, false);
    const foot = readString(value.foot, 160, false);
    const accent = readBool(value.accent);
    const items = readStrings(value.items, 200, 40);
    if (!title || sub === null || foot === null || accent === null || items === null) return null;
    const block: SkillPanelBlock = { type: "panel", title };
    if (sub) block.sub = sub;
    if (foot) block.foot = foot;
    if (typeof accent === "boolean") block.accent = accent;
    if (items) block.items = items;
    return block;
  }
  if (value.type === "note") {
    if (!exactKeys(value, ["type", "strong", "text"])) return null;
    const strong = readString(value.strong, 200, true);
    const text = readString(value.text, 600, true);
    if (!strong || !text) return null;
    const block: SkillNoteBlock = { type: "note", strong, text };
    return block;
  }
  if (value.type === "chips") {
    if (!exactKeys(value, ["type", "title", "sub", "foot", "accent", "width", "chips"])) return null;
    const title = readString(value.title, 160, true);
    const sub = readString(value.sub, 400, false);
    const foot = readString(value.foot, 160, false);
    const accent = readBool(value.accent);
    const width = readWidth(value.width);
    if (!title || sub === null || foot === null || accent === null || width === null) return null;
    if (!Array.isArray(value.chips) || value.chips.length > 40) return null;
    const chips: SkillChipBlock["chips"][number][] = [];
    for (const chip of value.chips) {
      if (!isRecord(chip) || !exactKeys(chip, ["label", "hot"])) return null;
      const chipLabel = readString(chip.label, 80, true);
      const hot = readBool(chip.hot);
      if (!chipLabel || hot === null) return null;
      chips.push(typeof hot === "boolean" ? { label: chipLabel, hot } : { label: chipLabel });
    }
    const block: SkillChipBlock = { type: "chips", title, chips };
    if (sub) block.sub = sub;
    if (foot) block.foot = foot;
    if (typeof accent === "boolean") block.accent = accent;
    if (width) block.width = width;
    return block;
  }
  if (value.type === "cards") {
    if (!exactKeys(value, ["type", "label", "layout", "ids", "group", "count", "foot", "width"])) return null;
    const label = readString(value.label, 200, false);
    const foot = readString(value.foot, 160, false);
    const group = readString(value.group, 40, false);
    const width = readWidth(value.width);
    const ids = readStrings(value.ids, 64, 40);
    if (label === null || foot === null || group === null || width === null || ids === null) return null;
    if (value.layout !== "stack" && value.layout !== "grid" && value.layout !== "grid-3") return null;
    if (value.count != null && value.count !== "skill" && value.count !== "topic") return null;
    if (ids && ids.some((id) => !SLUG.test(id))) return null;
    const block: SkillCardsBlock = { type: "cards", layout: value.layout };
    if (label) block.label = label;
    if (ids) block.ids = ids;
    if (group) block.group = group;
    if (value.count === "skill" || value.count === "topic") block.count = value.count;
    if (foot) block.foot = foot;
    if (width) block.width = width;
    return block;
  }
  if (value.type === "flow") {
    if (!exactKeys(value, ["type"])) return null;
    return { type: "flow" };
  }
  if (value.type === "group") {
    if (!exactKeys(value, ["type", "label", "width", "sections"])) return null;
    const label = readString(value.label, 200, false);
    const width = readWidth(value.width);
    if (label === null || width === null) return null;
    if (!Array.isArray(value.sections) || value.sections.length > 20) return null;
    const sections: SkillBlock[] = [];
    for (const section of value.sections) {
      const block = readBlock(section, depth + 1);
      if (!block) return null;
      sections.push(block);
    }
    const block: SkillGroupBlock = { type: "group", sections };
    if (label) block.label = label;
    if (width) block.width = width;
    return block;
  }
  return null;
}

function readPage(value: unknown): SkillPage | null | undefined {
  if (value == null) return undefined;
  if (!isRecord(value) || !exactKeys(value, ["eyebrow", "title", "blurb", "sections"])) return null;
  const title = readString(value.title, 160, true);
  const eyebrow = readString(value.eyebrow, 80, false);
  const blurb = readString(value.blurb, 600, false);
  if (!title || eyebrow === null || blurb === null) return null;
  if (!Array.isArray(value.sections) || value.sections.length > 20) return null;
  const sections: SkillBlock[] = [];
  for (const section of value.sections) {
    const block = readBlock(section, 0);
    if (!block) return null;
    sections.push(block);
  }
  const page: SkillPage = { title, sections };
  if (eyebrow) page.eyebrow = eyebrow;
  if (blurb) page.blurb = blurb;
  return page;
}

function readPath(value: unknown): SkillPath | null | undefined {
  if (value == null) return undefined;
  if (!isRecord(value) || !exactKeys(value, ["left", "right", "edges"])) return null;
  const left = readStrings(value.left, 64, 12);
  const right = readStrings(value.right, 64, 12);
  if (!left || !right || left.length === 0 || right.length === 0) return null;
  if (left.some((id) => !SLUG.test(id)) || right.some((id) => !SLUG.test(id))) return null;
  if (!Array.isArray(value.edges) || value.edges.length > 24) return null;
  const edges: SkillPathEdge[] = [];
  for (const edge of value.edges) {
    if (!isRecord(edge) || !exactKeys(edge, ["from", "to", "kind"])) return null;
    const from = readString(edge.from, 64, true);
    const to = readString(edge.to, 64, true);
    if (!from || !to || !SLUG.test(from) || !SLUG.test(to)) return null;
    if (edge.kind !== "branch" && edge.kind !== "across" && edge.kind !== "down" && edge.kind !== "join") return null;
    edges.push({ from, to, kind: edge.kind });
  }
  return { left, right, edges };
}

function readMapFlow(value: unknown): SkillNode["mapFlow"] | null | undefined {
  if (value == null) return undefined;
  if (!isRecord(value) || !exactKeys(value, ["left", "right", "hang"])) return null;
  const left = readString(value.left, 64, true);
  const right = readString(value.right, 64, true);
  const hang = readString(value.hang, 64, false);
  if (!left || !right || !SLUG.test(left) || !SLUG.test(right) || hang === null) return null;
  if (hang && !SLUG.test(hang)) return null;
  const flow: { left: string; right: string; hang?: string } = { left, right };
  if (hang) flow.hang = hang;
  return flow;
}

type Budget = { nodes: number };

function readNode(value: unknown, depth: number, isRoot: boolean, budget: Budget): SkillNode | null {
  if (!isRecord(value) || depth > MAX_DEPTH) return null;
  budget.nodes += 1;
  if (budget.nodes > MAX_NODES) return null;
  if (!exactKeys(value, ["id", "slug", "fromOverview", "crumb", "group", "card", "map", "mapFlow", "path", "curriculum", "hint", "page", "children"])) {
    return null;
  }
  const id = readString(value.id, 64, true);
  const crumb = readString(value.crumb, 120, true);
  const group = readString(value.group, 40, false);
  const hint = readString(value.hint, 240, false);
  if (!id || !SLUG.test(id) || !crumb || group === null || hint === null) return null;
  if (isRoot && id !== skillTree.id) return null;
  const slug = readSlug(value.slug);
  if (!slug) return null;
  if (isRoot && slug.length !== 0) return null;
  if (!isRoot && slug.length === 0) return null;
  const fromOverview = value.fromOverview == null ? undefined : readSlug(value.fromOverview);
  if (fromOverview === null || (fromOverview && fromOverview.length === 0)) return null;
  const card = readCard(value.card);
  const map = value.map == null ? undefined : readCard(value.map);
  const mapFlow = readMapFlow(value.mapFlow);
  const path = readPath(value.path);
  const page = readPage(value.page);
  if (!card || map === null || mapFlow === null || path === null || page === null) return null;
  if ("curriculum" in value && value.curriculum !== null) return null;
  if (!Array.isArray(value.children) || value.children.length > 50) return null;
  const children: SkillNode[] = [];
  for (const child of value.children) {
    const read = readNode(child, depth + 1, false, budget);
    if (!read) return null;
    children.push(read);
  }
  const node: SkillNode = { id, slug, crumb, card, children };
  if (fromOverview) node.fromOverview = fromOverview;
  if (group) node.group = group;
  if (map) node.map = map;
  if (mapFlow) node.mapFlow = mapFlow;
  if (path) node.path = path;
  if ("curriculum" in value) node.curriculum = null;
  if (hint) node.hint = hint;
  if (page) node.page = page;
  return node;
}

function slugConflict(left: readonly string[], right: readonly string[]) {
  if (left.length === 0 || right.length === 0) return true;
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function treeDepth(node: SkillNode): number {
  if (node.children.length === 0) return 1;
  return 1 + Math.max(...node.children.map((child) => treeDepth(child)));
}

/** Why a built SkillNode cannot be saved. Null means the shape is ok. */
export function structureProblem(tree: SkillNode): SkillTreeEditReason | null {
  if (tree.id !== skillTree.id || tree.slug.length !== 0) return "invalid";
  if (nodeCount(tree) > MAX_NODES || treeDepth(tree) > MAX_DEPTH) return "invalid";
  const ids = new Set<string>();
  function walk(node: SkillNode): SkillTreeEditReason | null {
    if (!SLUG.test(node.id) || ids.has(node.id)) return "invalid";
    ids.add(node.id);
    if (node.id !== tree.id && node.slug.length === 0) return "slug";
    for (let index = 0; index < node.children.length; index += 1) {
      for (let other = index + 1; other < node.children.length; other += 1) {
        const left = node.children[index];
        const right = node.children[other];
        if (left && right && slugConflict(left.slug, right.slug)) return "slug";
      }
      const child = node.children[index];
      if (!child) continue;
      const problem = walk(child);
      if (problem) return problem;
    }
    return null;
  }
  const walked = walk(tree);
  if (walked) return walked;

  const paths: { id: string; path: string[] }[] = [];
  function collectPaths(node: SkillNode, prefix: string[]) {
    if (prefix.length > 0) paths.push({ id: node.id, path: prefix });
    for (const child of node.children) collectPaths(child, [...prefix, ...child.slug]);
  }
  collectPaths(tree, []);

  const shortcuts: { id: string; path: string[] }[] = [];
  function collectShortcuts(node: SkillNode) {
    if (node.fromOverview) shortcuts.push({ id: node.id, path: [...node.fromOverview] });
    node.children.forEach(collectShortcuts);
  }
  collectShortcuts(tree);
  for (let index = 0; index < shortcuts.length; index += 1) {
    const shortcut = shortcuts[index];
    if (!shortcut) continue;
    for (const path of paths) {
      if (slugConflict(shortcut.path, path.path)) return "shortcut";
    }
    for (let other = index + 1; other < shortcuts.length; other += 1) {
      const next = shortcuts[other];
      if (next && slugConflict(shortcut.path, next.path)) return "shortcut";
    }
  }
  return null;
}

export function parseSkillTree(input: unknown): SkillNode | null {
  const value = typeof input === "string" ? parseJson(input) : input;
  const tree = readNode(value, 0, true, { nodes: 0 });
  if (!tree) return null;
  if (structureProblem(tree)) return null;
  return tree;
}

function parseJson(input: string): unknown {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return null;
  }
}

export function builtinSkillTree(): SkillNode {
  const parsed = parseSkillTree(skillTree);
  if (!parsed) throw new Error("Built-in skill tree is invalid.");
  return parsed;
}

function replaceNode(tree: SkillNode, id: string, next: SkillNode): SkillNode {
  if (tree.id === id) return next;
  let changed = false;
  const children = tree.children.map((child) => {
    const updated = replaceNode(child, id, next);
    if (updated !== child) changed = true;
    return updated;
  });
  return changed ? { ...tree, children } : tree;
}

function updateChildren(tree: SkillNode, parentId: string, children: SkillNode[]): SkillNode {
  return replaceNode(tree, parentId, { ...(findNode(parentId, tree) as SkillNode), children });
}

function commit(tree: SkillNode, focusId: string): SkillTreeEditResult {
  const problem = structureProblem(tree);
  if (problem) return { ok: false, reason: problem };
  const parsed = parseSkillTree(tree);
  if (!parsed) return { ok: false, reason: "invalid" };
  return { ok: true, tree: parsed, focusId };
}

function clean(value: string, max: number): string | undefined | null {
  const text = value.trim();
  if (!text) return undefined;
  if (text.length > max) return null;
  return text;
}

function renamePanels(sections: readonly SkillBlock[], from: string, to: string): SkillBlock[] {
  if (!from || from === to) return [...sections];
  return sections.map((section) => {
    if (section.type === "panel" && section.title === from) return { ...section, title: to };
    if (section.type === "group") return { ...section, sections: renamePanels(section.sections, from, to) };
    return section;
  });
}

function openLabel(label: string | undefined, previous: string[], next: string) {
  if (!label) return undefined;
  if (previous.some((title) => label === `Open ${title}`)) return `Open ${next}`;
  return label;
}

export function applyNodePatch(tree: SkillNode, id: string, draft: NodeDraft): SkillTreeEditResult {
  const node = findNode(id, tree);
  if (!node) return { ok: false, reason: "missing" };
  const cardTitle = draft.cardTitle.trim();
  const crumb = draft.crumb.trim();
  if (!cardTitle || cardTitle.length > 120) return { ok: false, reason: "title" };
  if (!crumb || crumb.length > 120) return { ok: false, reason: "crumb" };
  const cardSub = clean(draft.cardSub, 240);
  const mapSub = clean(draft.mapSub, 240);
  const blurb = clean(draft.blurb, 500);
  const hint = clean(draft.hint, 240);
  const pageTitle = draft.pageTitle.trim();
  if (cardSub === null || mapSub === null || blurb === null || hint === null || pageTitle.length > 160) {
    return { ok: false, reason: "invalid" };
  }
  if (node.page && !pageTitle) return { ok: false, reason: "title" };

  const card: SkillCard = { ...node.card, title: cardTitle };
  const nextLabel = openLabel(node.card.label, [node.card.title], cardTitle);
  if (nextLabel) card.label = nextLabel;
  else delete card.label;
  if (cardSub) card.sub = cardSub;
  else delete card.sub;

  const next: SkillNode = { ...node, crumb, card, children: node.children };
  if (node.map) {
    const map: SkillCard = { ...node.map, title: cardTitle };
    const mapLabel = openLabel(node.map.label, [node.map.title, node.card.title], cardTitle);
    if (mapLabel) map.label = mapLabel;
    else delete map.label;
    if (mapSub) map.sub = mapSub;
    else delete map.sub;
    next.map = map;
  } else {
    delete next.map;
  }

  if (node.id === tree.id) {
    next.slug = [];
    delete next.fromOverview;
    if (hint) next.hint = hint;
    else delete next.hint;
    return commit(replaceNode(tree, id, next), id);
  }

  const slug = parseSlugInput(draft.slug);
  if (!slug || slug.length === 0) return { ok: false, reason: "slug" };
  next.slug = slug;
  const shortcut = draft.shortcut.trim();
  if (!shortcut) {
    delete next.fromOverview;
  } else {
    const parts = parseSlugInput(shortcut);
    if (!parts || parts.length === 0) return { ok: false, reason: "shortcut" };
    next.fromOverview = parts;
  }

  if (hint) next.hint = hint;
  else delete next.hint;

  if (node.page || pageTitle || blurb) {
    const title = pageTitle || cardTitle;
    const sections = node.page ? renamePanels(node.page.sections, node.page.title, title) : [{ type: "panel" as const, title, foot: "Open →" }];
    const page: SkillPage = { ...node.page, title, sections };
    if (blurb) page.blurb = blurb;
    else delete page.blurb;
    next.page = page;
  }

  return commit(replaceNode(tree, id, next), id);
}

function takenIds(tree: SkillNode) {
  const ids = new Set<string>();
  function walk(node: SkillNode) {
    ids.add(node.id);
    node.children.forEach(walk);
  }
  walk(tree);
  return ids;
}

function uniqueId(tree: SkillNode, base: string) {
  const ids = takenIds(tree);
  if (!ids.has(base)) return base;
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const id = `${base}-${suffix}`.replace(/-+/g, "-").slice(0, 64);
    if (SLUG.test(id) && !ids.has(id)) return id;
  }
  return `${base}-x`;
}

export function addChildNode(tree: SkillNode, parentId: string, input: NewNodeInput): SkillTreeEditResult {
  const parent = findNode(parentId, tree);
  if (!parent) return { ok: false, reason: "missing" };
  const title = input.title.trim();
  if (!title || title.length > 120) return { ok: false, reason: "title" };
  const blurb = clean(input.blurb, 500);
  if (blurb === null) return { ok: false, reason: "invalid" };
  const slug = input.slug.trim() ? parseSlugInput(input.slug) : null;
  if (input.slug.trim() && (!slug || slug.length === 0)) return { ok: false, reason: "slug" };
  const id = uniqueId(tree, slugify(title));
  const node: SkillNode = {
    id,
    slug: slug && slug.length > 0 ? slug : [id],
    crumb: title,
    card: {
      title,
      foot: "Open →",
      label: `Open ${title}`,
      ...(blurb ? { sub: blurb } : {}),
    },
    page: {
      title,
      ...(blurb ? { blurb } : {}),
      sections: [{ type: "panel", title, foot: "Open →", ...(blurb ? { sub: blurb } : {}) }],
    },
    children: [],
  };
  const next = updateChildren(tree, parent.id, [...parent.children, node]);
  return commit(next, id);
}

export function removeNode(tree: SkillNode, id: string): SkillTreeEditResult {
  if (id === tree.id) return { ok: false, reason: "root" };
  const parent = findParent(tree, id);
  if (!parent) return { ok: false, reason: "missing" };
  const next = updateChildren(
    tree,
    parent.id,
    parent.children.filter((child) => child.id !== id),
  );
  return commit(next, parent.id);
}

export function moveNode(tree: SkillNode, id: string, direction: "up" | "down"): SkillTreeEditResult {
  if (id === tree.id) return { ok: false, reason: "root" };
  const parent = findParent(tree, id);
  if (!parent) return { ok: false, reason: "missing" };
  const index = parent.children.findIndex((child) => child.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= parent.children.length) return { ok: true, tree, focusId: id };
  const children = [...parent.children];
  const [item] = children.splice(index, 1);
  if (!item) return { ok: false, reason: "missing" };
  children.splice(target, 0, item);
  return commit(updateChildren(tree, parent.id, children), id);
}

export function reparentNode(tree: SkillNode, id: string, parentId: string): SkillTreeEditResult {
  if (id === tree.id) return { ok: false, reason: "root" };
  if (id === parentId) return { ok: false, reason: "cycle" };
  const node = findNode(id, tree);
  const parent = findNode(parentId, tree);
  const current = findParent(tree, id);
  if (!node || !parent || !current) return { ok: false, reason: "missing" };
  if (findNode(parentId, node)) return { ok: false, reason: "cycle" };
  if (current.id === parent.id) return { ok: true, tree, focusId: id };
  const detached = updateChildren(
    tree,
    current.id,
    current.children.filter((child) => child.id !== id),
  );
  const nextParent = findNode(parent.id, detached);
  if (!nextParent) return { ok: false, reason: "missing" };
  const next = updateChildren(detached, nextParent.id, [...nextParent.children, node]);
  return commit(next, id);
}
