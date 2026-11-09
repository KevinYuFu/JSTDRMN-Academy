import previousDefault from "./skill-tree-previous-default.json";

/**
 * Skill Tree content and routes.
 *
 * `skillTree` is the built-in map. Neon stores the live map in one JSON row.
 * When that row is missing, the app copies this object in once.
 * A row that is still the previous built-in map is shown as this object and is not written back.
 * Any other saved map is left as the Lead saved it.
 * A Lead edits the live map at /teacher/skill-tree. The public page reads the database.
 *
 * Shape:
 * - `children` is the drill path and the URL (`slug` segments).
 * - `page.sections` is what the drill-in shows (panel, note, chips, cards, flow).
 * - The overview stays the original four branches. Community, Branding, and Education
 *   are unchanged. The DJ branch is the introduction and the eight-step diagram.
 * - `path` on that branch draws the diagram. It is optional.
 *   Saved maps without a complete path keep the older column layout.
 * - `mapFlow` draws that older tight overview: left, right, and `hang` under the right card.
 * - `fromOverview` is only for a different URL when the card is opened from the map.
 * - `curriculum: null` means the list was not supplied. Leave it null.
 *
 * Temporary name and route — Yu has not picked a final name.
 * - Change `skillTreeNav.label` to rename the menu and the on-page label.
 * - Change `skillTreeNav.href` and move `app/skill-tree` together if the path changes.
 */

export const skillTreeNav = {
  key: "skill-tree",
  label: "Skill Tree",
  href: "/skill-tree",
} as const;

export type SkillCard = {
  title: string;
  sub?: string;
  foot?: string;
  accent?: boolean;
  label?: string;
};

export type SkillPanelBlock = {
  type: "panel";
  title: string;
  sub?: string;
  foot?: string;
  accent?: boolean;
  items?: readonly string[];
};

export type SkillNoteBlock = {
  type: "note";
  strong: string;
  text: string;
};

export type SkillChipBlock = {
  type: "chips";
  title: string;
  sub?: string;
  foot?: string;
  accent?: boolean;
  width?: "narrow" | "core" | "hub";
  chips: readonly { label: string; hot?: boolean }[];
};

export type SkillCardsBlock = {
  type: "cards";
  label?: string;
  layout: "stack" | "grid" | "grid-3";
  /** Child ids to show. Omit to use every child, then filter with `group`. */
  ids?: readonly string[];
  group?: string;
  /** Card subtitle becomes "N skills" or "N topics" from that node's list. */
  count?: "skill" | "topic";
  foot?: string;
  width?: "narrow" | "core" | "hub";
};

export type SkillFlowBlock = {
  type: "flow";
};

export type SkillGroupBlock = {
  type: "group";
  label?: string;
  width?: "narrow" | "core" | "hub";
  sections: readonly SkillBlock[];
};

export type SkillBlock = SkillPanelBlock | SkillNoteBlock | SkillChipBlock | SkillCardsBlock | SkillFlowBlock | SkillGroupBlock;

export type SkillPathEdge = {
  from: string;
  to: string;
  kind: "branch" | "across" | "down" | "join";
};

/** Two chains under the overview, plus the connectors between them. */
export type SkillPath = {
  left: readonly string[];
  right: readonly string[];
  edges: readonly SkillPathEdge[];
};

export type SkillPage = {
  eyebrow?: string;
  title: string;
  blurb?: string;
  sections: readonly SkillBlock[];
};

export type SkillNode = {
  id: string;
  /** URL segments under the parent. The overview itself has none. */
  slug: readonly string[];
  /**
   * URL when this card is opened from the overview, if it differs from `slug`.
   * Advanced DJ uses this (`advanced-dj` vs `advanced`).
   */
  fromOverview?: readonly string[];
  crumb: string;
  /** Lets a cards block show one set of children (courses, skills, and so on). */
  group?: string;
  card: SkillCard;
  /** Overview card text when it should differ from `card`. */
  map?: SkillCard;
  /**
   * Tight pair on the overview, and the same pair on this node's flow block.
   * `hang` is a sibling drawn under the right card. Its URL stays a child of this node.
   * Older saved maps use this. The introduction branch uses `path` instead.
   */
  mapFlow?: { left: string; right: string; hang?: string };
  /**
   * Diagram under this branch. Every direct child is listed once, in `left` or `right`.
   * Omitted on older saved maps, which keep the column layout.
   */
  path?: SkillPath;
  /** Null means no curriculum was supplied. Do not fill it in. */
  curriculum?: null;
  hint?: string;
  page?: SkillPage;
  children: readonly SkillNode[];
};

const open = "Open →";

function originalBranch(id: "community" | "branding" | "education"): SkillNode {
  const children = (previousDefault as { children: SkillNode[] }).children;
  const found = children.find((child) => child.id === id);
  if (!found) throw new Error(`Original ${id} branch is missing.`);
  return structuredClone(found);
}

function step(input: { id: string; slug: readonly string[]; title: string; sub: string }): SkillNode {
  return {
    id: input.id,
    slug: input.slug,
    crumb: input.title,
    card: {
      title: input.title,
      sub: input.sub,
      foot: open,
      label: `Open ${input.title}`,
    },
    curriculum: null,
    page: {
      eyebrow: input.title,
      title: input.title,
      blurb: input.sub,
      sections: [{ type: "panel", title: input.title, sub: input.sub }],
    },
    children: [],
  };
}

const introDj = step({
  id: "dj-bootcamp",
  slug: ["bootcamp"],
  title: "Intro DJ Bootcamp",
  sub: "Get Stage Ready",
});

const mashup = step({
  id: "mashup",
  slug: ["mashup"],
  title: "Ableton/Mashup Bootcamp",
  sub: "Start in ableton with mashups",
});

const intermediateDj = step({
  id: "intermediate-dj",
  slug: ["intermediate-dj"],
  title: "Intermediate DJ Bootcamp",
  sub: "Business, direct support, set curation",
});

const introProduction = step({
  id: "intro-production",
  slug: ["intro-production"],
  title: "Intro Production Bootcamp",
  sub: "First Track Beginning to End",
});

const retreat = step({
  id: "dj-retreat",
  slug: ["dj-retreat"],
  title: "DJ Retreat",
  sub: "Gathering of DJ's",
});

const intermediateProduction = step({
  id: "intermediate-production",
  slug: ["intermediate-production"],
  title: "Intermediate Production Bootcamp",
  sub: "Making Polished Professional Tracks",
});

const finisher = step({
  id: "track-finisher",
  slug: ["track-finisher"],
  title: "Track Finisher Bootcamp",
  sub: "Meet, Colab, Get Inspired",
});

/**
 * Replaces the DJ branch. The introduction is that entry.
 * Left: Intro DJ, Intermediate DJ, DJ Retreat.
 * Right: Ableton/Mashup, Intro Production, Intermediate Production, Track Finisher.
 * Intro DJ also points across to Ableton/Mashup.
 * DJ Retreat also joins Track Finisher along the lower outside of the left path.
 */
const introduction: SkillNode = {
  id: "dj",
  slug: ["dj"],
  crumb: "Introduction to Music and EDM",
  card: {
    title: "Introduction to Music and EDM",
    sub: "Getting comfortable with music",
    foot: open,
    label: "Open Introduction to Music and EDM",
  },
  path: {
    left: ["dj-bootcamp", "intermediate-dj", "dj-retreat"],
    right: ["mashup", "intro-production", "intermediate-production", "track-finisher"],
    edges: [
      { from: "dj", to: "dj-bootcamp", kind: "branch" },
      { from: "dj", to: "mashup", kind: "branch" },
      { from: "dj-bootcamp", to: "mashup", kind: "across" },
      { from: "dj-bootcamp", to: "intermediate-dj", kind: "down" },
      { from: "intermediate-dj", to: "dj-retreat", kind: "down" },
      { from: "mashup", to: "intro-production", kind: "down" },
      { from: "intro-production", to: "intermediate-production", kind: "down" },
      { from: "intermediate-production", to: "track-finisher", kind: "down" },
      { from: "dj-retreat", to: "track-finisher", kind: "join" },
    ],
  },
  page: {
    eyebrow: "Introduction to Music and EDM",
    title: "Introduction to Music and EDM",
    blurb: "Getting comfortable with music",
    sections: [{ type: "flow" }],
  },
  children: [introDj, mashup, intermediateDj, introProduction, retreat, intermediateProduction, finisher],
};

/**
 * The map. Same four branches as before. DJ is now the introduction diagram.
 * Community, Branding, and Education are the original branches.
 */
export const skillTree: SkillNode = {
  id: "overview",
  slug: [],
  crumb: "Overview",
  card: { title: "JSTDRMN Academy" },
  hint: "Overview shows branches only · details open after you click",
  children: [originalBranch("community"), introduction, originalBranch("branding"), originalBranch("education")],
};

export function countLabel(kind: "skill" | "topic", count: number) {
  const word = count === 1 ? kind : `${kind}s`;
  return `${count} ${word}`;
}

export function findNode(id: string, node: SkillNode = skillTree): SkillNode | undefined {
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findNode(id, child);
    if (found) return found;
  }
  return undefined;
}

export function childById(node: SkillNode, id: string) {
  return node.children.find((child) => child.id === id);
}

export type ResolvedSkillPath = {
  left: SkillNode[];
  right: SkillNode[];
  across: boolean;
  join: boolean;
};

function hasPathEdge(edges: readonly SkillPathEdge[], kind: SkillPathEdge["kind"], from: string, to: string) {
  return edges.some((edge) => edge.kind === kind && edge.from === from && edge.to === to);
}

/**
 * Draw `path` only when it names every direct child once and the edges are
 * the intro split, the two chains, and the optional across link and lower join.
 * A saved map that adds, removes, or rewires a node keeps the older columns
 * so nothing is hidden and no connector is invented.
 */
export function resolvedSkillPath(root: SkillNode): ResolvedSkillPath | null {
  const path = root.path;
  if (!path || path.left.length === 0 || path.right.length === 0) return null;
  const listed = [...path.left, ...path.right];
  if (new Set(listed).size !== listed.length) return null;
  const childIds = root.children.map((child) => child.id);
  if (listed.length !== childIds.length || listed.some((id) => !childIds.includes(id))) return null;
  const left = path.left.map((id) => childById(root, id));
  const right = path.right.map((id) => childById(root, id));
  if (left.some((node) => !node) || right.some((node) => !node)) return null;
  const leftNodes = left.filter((node): node is SkillNode => Boolean(node));
  const rightNodes = right.filter((node): node is SkillNode => Boolean(node));
  const firstLeft = leftNodes[0];
  const firstRight = rightNodes[0];
  const lastLeft = leftNodes[leftNodes.length - 1];
  const lastRight = rightNodes[rightNodes.length - 1];
  if (!firstLeft || !firstRight || !lastLeft || !lastRight) return null;
  const expected: SkillPathEdge[] = [
    { from: root.id, to: firstLeft.id, kind: "branch" },
    { from: root.id, to: firstRight.id, kind: "branch" },
  ];
  for (let index = 1; index < leftNodes.length; index += 1) {
    const from = leftNodes[index - 1];
    const to = leftNodes[index];
    if (!from || !to) return null;
    expected.push({ from: from.id, to: to.id, kind: "down" });
  }
  for (let index = 1; index < rightNodes.length; index += 1) {
    const from = rightNodes[index - 1];
    const to = rightNodes[index];
    if (!from || !to) return null;
    expected.push({ from: from.id, to: to.id, kind: "down" });
  }
  const across = hasPathEdge(path.edges, "across", firstLeft.id, firstRight.id);
  const join = hasPathEdge(path.edges, "join", lastLeft.id, lastRight.id);
  if (across) expected.push({ from: firstLeft.id, to: firstRight.id, kind: "across" });
  if (join) expected.push({ from: lastLeft.id, to: lastRight.id, kind: "join" });
  if (path.edges.length !== expected.length) return null;
  if (expected.some((edge) => !hasPathEdge(path.edges, edge.kind, edge.from, edge.to))) return null;
  return { left: leftNodes, right: rightNodes, across, join };
}

/** First bullet list on a node. Cards use this for "N skills". */
export function panelItems(node: SkillNode): readonly string[] {
  return firstItems(node.page?.sections ?? []) ?? [];
}

function firstItems(sections: readonly SkillBlock[]): readonly string[] | undefined {
  for (const section of sections) {
    if (section.type === "panel" && section.items) return section.items;
    if (section.type === "group") {
      const nested = firstItems(section.sections);
      if (nested) return nested;
    }
  }
  return undefined;
}

export function cardsFor(node: SkillNode, block: SkillCardsBlock): SkillNode[] {
  const chosen = block.ids ? block.ids.map((id) => childById(node, id)).filter((item): item is SkillNode => Boolean(item)) : [...node.children];
  return block.group ? chosen.filter((item) => item.group === block.group) : chosen;
}

function startsWith(parts: readonly string[], segments: readonly string[]) {
  if (segments.length === 0 || parts.length < segments.length) return false;
  return segments.every((segment, index) => parts[index] === segment);
}

function matchChildren(parent: SkillNode, parts: readonly string[]): SkillNode[] | null {
  for (const child of parent.children) {
    if (!startsWith(parts, child.slug)) continue;
    const rest = parts.slice(child.slug.length);
    if (rest.length === 0) return [child];
    const deeper = matchChildren(child, rest);
    if (deeper) return [child, ...deeper];
  }
  return null;
}

function flowTargets(node: SkillNode): SkillNode[] {
  const ids: string[] = [];
  if (node.mapFlow) ids.push(node.mapFlow.left, node.mapFlow.right, ...(node.mapFlow.hang ? [node.mapFlow.hang] : []));
  if (node.path) ids.push(...node.path.left, ...node.path.right);
  return ids.map((id) => childById(node, id)).filter((item): item is SkillNode => Boolean(item));
}

function matchShortcut(parts: readonly string[], node: SkillNode): SkillNode[] | null {
  for (const target of flowTargets(node)) {
    const segments = target.fromOverview ?? target.slug;
    if (!startsWith(parts, segments)) continue;
    const rest = parts.slice(segments.length);
    if (rest.length === 0) return [target];
    const deeper = matchChildren(target, rest);
    if (deeper) return [target, ...deeper];
  }
  for (const child of node.children) {
    const found = matchShortcut(parts, child);
    if (found) return found;
  }
  return null;
}

/** Turns a URL slug into the breadcrumb. Unknown paths return null. */
export function stackFromSlug(slug: readonly string[] | undefined, tree: SkillNode = skillTree): SkillNode[] | null {
  const parts = slug ?? [];
  if (parts.some((part) => part.length === 0)) return null;
  if (parts.length === 0) return [tree];
  const nested = matchChildren(tree, parts);
  if (nested) return [tree, ...nested];
  const shortcut = matchShortcut(parts, tree);
  if (shortcut) return [tree, ...shortcut];
  return null;
}

/** Inverse of stackFromSlug. The overview is an empty slug. */
export function slugFromStack(stack: readonly SkillNode[], tree: SkillNode = skillTree): string[] | null {
  if (stack.length === 0 || stack[0]?.id !== tree.id) return null;
  const slug: string[] = [];
  for (let index = 1; index < stack.length; index += 1) {
    const node = stack[index];
    const previous = stack[index - 1];
    if (!node) return null;
    const segments = previous?.id === tree.id && node.fromOverview ? node.fromOverview : node.slug;
    if (segments.length === 0) return null;
    slug.push(...segments);
  }
  return slug;
}

export function skillTreeHref(stack: readonly SkillNode[]): string {
  const slug = slugFromStack(stack);
  if (!slug || slug.length === 0) return skillTreeNav.href;
  return `${skillTreeNav.href}/${slug.join("/")}`;
}

export function drillHref(stack: readonly SkillNode[], node: SkillNode): string {
  return skillTreeHref([...stack, node]);
}

export function parentHref(stack: readonly SkillNode[]): string | null {
  if (stack.length < 2) return null;
  return skillTreeHref(stack.slice(0, -1));
}

/** Path from the overview down to one node. */
export function stackForNode(tree: SkillNode, id: string): SkillNode[] | null {
  function walk(current: SkillNode, chain: SkillNode[]): SkillNode[] | null {
    const next = [...chain, current];
    if (current.id === id) return next;
    for (const child of current.children) {
      const found = walk(child, next);
      if (found) return found;
    }
    return null;
  }
  return walk(tree, []);
}

/**
 * Column tracks for the overview.
 * The built-in four branches keep the original widths: DJ is the wide one.
 */
export function overviewColumns(root: SkillNode) {
  if (root.children.length === 0) return "1fr";
  return root.children
    .map((branch) => {
      if (branch.path) return "minmax(480px, 680px)";
      if (branch.mapFlow) return "minmax(220px, 360px)";
      return "minmax(0, 210px)";
    })
    .join(" ");
}

function markShown(node: SkillNode, sections: readonly SkillBlock[], shown: Set<string>): boolean {
  for (const section of sections) {
    if (section.type === "cards") {
      if (!section.ids && !section.group) return true;
      if (section.ids) {
        for (const id of section.ids) shown.add(id);
      }
      if (section.group) {
        for (const child of node.children) {
          if (child.group === section.group) shown.add(child.id);
        }
      }
    }
    if (section.type === "flow" && node.mapFlow) {
      shown.add(node.mapFlow.left);
      shown.add(node.mapFlow.right);
      if (node.mapFlow.hang) shown.add(node.mapFlow.hang);
    }
    if (section.type === "flow" && node.path) {
      for (const id of [...node.path.left, ...node.path.right]) shown.add(id);
    }
    if (section.type === "group" && markShown(node, section.sections, shown)) return true;
  }
  return false;
}

/** Children the page design does not already link. The public page still lists these. */
export function unlinkedChildren(node: SkillNode): SkillNode[] {
  const shown = new Set<string>();
  if (markShown(node, node.page?.sections ?? [], shown)) return [];
  return node.children.filter((child) => !shown.has(child.id));
}
