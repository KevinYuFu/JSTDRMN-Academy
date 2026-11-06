/**
 * Skill Tree content and routes.
 *
 * `skillTree` is the only copy source. The page walks this object.
 * It does not keep a separate screen for each node.
 *
 * To add or edit a node, change it here:
 * - `children` is the drill path and the URL (`slug` segments).
 * - `page.sections` is what the drill-in shows (panel, note, chips, cards, flow).
 * - `mapFlow` on DJ draws the tight overview: left, right, and `hang` under the right card.
 * - `fromOverview` is only for a different URL when the card is opened from the map
 *   (Advanced DJ is `/advanced-dj` from the map and `/dj/advanced` from the DJ page).
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
   */
  mapFlow?: { left: string; right: string; hang?: string };
  /** Null means no curriculum was supplied. Do not fill it in. */
  curriculum?: null;
  hint?: string;
  page?: SkillPage;
  children: readonly SkillNode[];
};

const open = "Open →";

const noCurriculum = "No invented curriculum.";
const skillPlacement = "Production skills stay on the shared tree. Do not invent beginner / intermediate module lists.";

function listed(input: {
  id: string;
  title: string;
  slug?: readonly string[];
  group: string;
  items: readonly string[];
  eyebrow: string;
  blurb: string;
  foot: string;
}): SkillNode {
  return {
    id: input.id,
    slug: input.slug ?? [input.id],
    crumb: input.title,
    group: input.group,
    card: { title: input.title, label: `Open ${input.title}` },
    page: {
      eyebrow: input.eyebrow,
      title: input.title,
      blurb: input.blurb,
      sections: [{ type: "panel", title: input.title, foot: input.foot, items: input.items }],
    },
    children: [],
  };
}

function course(input: { id: string; title: string; foot: string; accent?: boolean; note?: string }): SkillNode {
  const note = input.note;
  return {
    id: input.id,
    slug: ["course", input.id],
    crumb: input.title,
    group: "course",
    card: {
      title: input.title,
      sub: note ?? "Course lane · skills shared below",
      foot: input.foot,
      accent: input.accent,
      label: `Open ${input.title}`,
    },
    page: {
      eyebrow: "Music Production",
      title: input.title,
      blurb: note ?? "Course lane inside Music Production. Shared skills stay on the production tree.",
      sections: [
        {
          type: "group",
          width: "narrow",
          sections: [
            {
              type: "panel",
              title: input.title,
              sub: note ?? "Known as a production course lane.",
              foot: input.foot,
              accent: input.accent,
            },
            { type: "note", strong: "Skill placement:", text: skillPlacement },
          ],
        },
      ],
    },
    children: [],
  };
}

const djSkills = [
  ["library", "Library", ["Library curation", "Library management"]],
  [
    "transitions",
    "Transitions",
    ["Beat / phrase alignment", "Reverb / echo", "Phaser / flanger / filter", "Loops", "Stems", "Scratching", "Doubles"],
  ],
  ["set-curation", "Set Curation", ["Right vibe for the crowd"]],
  ["edits", "Edits", ["Song edits"]],
  ["crowd-work", "Crowd Work", ["Reading and working the room"]],
  ["career", "Career Growth", ["Residency", "Networking"]],
] as const;

const productionSkills = [
  ["daw", "DAW", ["Audio manipulation", "MIDI", "Automation", "Routing", "File management"]],
  ["theory", "Music Theory", ["Rhythm / counting", "Scales & chords", "Arrangement & phrasing", "Tension & release", "Call & response"]],
  ["cinema", "Cinema / FX", ["Risers", "Impacts", "Atmosphere", "Layering"]],
  [
    "audio-fx",
    "Audio FX",
    ["Utility", "EQ", "Dynamics", "Limiter", "Multiband", "Filter", "Reverb", "Delay", "Chorus", "Autopan", "Waveshapers", "OTT", "Phaser / Flanger"],
  ],
  ["instruments", "Instruments", ["Samples & presets", "Synths", "Sound design"]],
  ["drums", "Drums", ["House patterns", "Breakbeat patterns", "Trap patterns", "Programming", "Dynamics"]],
] as const;

function placeholder(input: {
  id: string;
  crumb: string;
  card: SkillCard;
  page: SkillPage;
  curriculum?: null;
}): SkillNode {
  return {
    id: input.id,
    slug: [input.id],
    crumb: input.crumb,
    card: input.card,
    curriculum: input.curriculum ?? null,
    page: input.page,
    children: [],
  };
}

const community = placeholder({
  id: "community",
  crumb: "Community Events",
  card: { title: "Community", sub: "Events · gather and connect", foot: open, label: "Open Community Events" },
  page: {
    eyebrow: "Community Events",
    title: "Community Events",
    blurb: "Bringing producers and Dreamers together through shared events and community touchpoints.",
    sections: [
      {
        type: "group",
        width: "narrow",
        sections: [
          {
            type: "panel",
            title: "Community Events",
            sub: "Bringing producers and Dreamers together through shared events and community touchpoints.",
            foot: "Details coming later. Purpose only for now.",
          },
          { type: "note", strong: noCurriculum, text: "Details coming later. Purpose only for now." },
        ],
      },
    ],
  },
});

const branding = placeholder({
  id: "branding",
  crumb: "Branding",
  card: { title: "Branding", sub: "Artist identity and presence", foot: open, label: "Open Branding" },
  page: {
    eyebrow: "Branding",
    title: "Branding",
    blurb: "Artist identity and brand development for Dreamers building a public presence.",
    sections: [
      {
        type: "group",
        width: "narrow",
        sections: [
          {
            type: "panel",
            title: "Branding",
            sub: "Artist identity and brand development for Dreamers building a public presence.",
            foot: "Details coming later. Purpose only for now.",
          },
          { type: "note", strong: noCurriculum, text: "Details coming later. Purpose only for now." },
        ],
      },
    ],
  },
});

const education = placeholder({
  id: "education",
  crumb: "Education",
  card: {
    title: "Education",
    sub: "Required for teachers",
    foot: open,
    accent: true,
    label: "Open Education",
  },
  page: {
    eyebrow: "Education",
    title: "Instructor Training",
    blurb: "Required training for anyone who wants to teach at JSTDRMN Academy.",
    sections: [
      {
        type: "group",
        width: "narrow",
        sections: [
          {
            type: "panel",
            title: "Required to teach",
            sub: "Required training for anyone who wants to teach at JSTDRMN Academy.",
            foot: "Requirement confirmed. Course modules not written yet — not invented here.",
            accent: true,
          },
          {
            type: "note",
            strong: noCurriculum,
            text: "Requirement confirmed. Course modules not written yet — not invented here.",
          },
        ],
      },
    ],
  },
});

const advancedDj: SkillNode = {
  id: "advanced-dj",
  slug: ["advanced"],
  fromOverview: ["advanced-dj"],
  crumb: "Advanced DJ",
  curriculum: null,
  card: {
    title: "Advanced DJ",
    sub: "Working title · tentative",
    foot: open,
    accent: true,
    label: "Open Advanced DJ",
  },
  map: {
    title: "Advanced DJ",
    sub: "Working title",
    foot: open,
    accent: true,
    label: "Open Advanced DJ",
  },
  page: {
    eyebrow: "DJ",
    title: "Advanced DJ",
    blurb: "Placeholder for advanced DJ programming beyond the current simplified map.",
    sections: [
      {
        type: "group",
        width: "narrow",
        sections: [
          {
            type: "panel",
            title: "Advanced DJ",
            sub: "Working title",
            foot: "Working title — tentative. Curriculum not supplied yet.",
            accent: true,
          },
          {
            type: "note",
            strong: "Working title.",
            text: "Working title — tentative. Curriculum not supplied yet. No invented curriculum.",
          },
        ],
      },
    ],
  },
  children: [],
};

const djBootcamp: SkillNode = {
  id: "dj-bootcamp",
  slug: ["bootcamp"],
  crumb: "DJ Bootcamp",
  card: {
    title: "DJ Bootcamp",
    sub: "Standalone DJ training — crate craft, culture, and clean AV setup.",
    foot: open,
    label: "Open DJ Bootcamp",
  },
  page: {
    eyebrow: "DJ Bootcamp",
    title: "DJ Bootcamp",
    blurb: "Standalone DJ training — crate craft, culture, and clean AV setup.",
    sections: [
      {
        type: "group",
        width: "core",
        label: "Core foundations",
        sections: [
          {
            type: "panel",
            title: "Core DJ Skills",
            foot: "Taught in the bootcamp",
            items: ["Crate building & basics", "Genre mixing styles & culture", "AV equipment connections & clean cabling"],
          },
        ],
      },
      {
        type: "cards",
        label: "Skill categories · click for details",
        layout: "grid",
        group: "category",
        count: "skill",
        foot: "Open details →",
      },
    ],
  },
  children: djSkills.map(([id, title, items]) =>
    listed({
      id,
      title,
      group: "category",
      items,
      eyebrow: "DJ Bootcamp",
      blurb: "Skill details for this category.",
      foot: "DJ Bootcamp",
    }),
  ),
};

const mashup: SkillNode = {
  id: "mashup",
  slug: ["mashup"],
  crumb: "Mashup / Ableton",
  card: {
    title: "Mashup / Ableton Bootcamp",
    sub: "Stems, edits, release",
    foot: open,
    label: "Open Mashup Ableton Bootcamp",
  },
  page: {
    eyebrow: "Ableton / Mashup",
    title: "Mashup / Ableton Bootcamp",
    blurb: "Build mashups in Ableton and ship a release.",
    sections: [
      {
        type: "chips",
        title: "Mashup focus",
        sub: "What this bootcamp covers",
        foot: "Leads into Music Production",
        accent: true,
        width: "narrow",
        chips: [
          { label: "Ableton basics" },
          { label: "Stem splitting" },
          { label: "Editing" },
          { label: "Mix / master mashups" },
          { label: "SoundCloud release", hot: true },
        ],
      },
    ],
  },
  children: [],
};

const production: SkillNode = {
  id: "production",
  slug: ["production"],
  crumb: "Production Bootcamp",
  card: {
    title: "Production Bootcamp",
    sub: "Via Mashup path · shared skills",
    foot: open,
    label: "Open Production Bootcamp",
  },
  map: {
    title: "Production Bootcamp",
    sub: "Via Mashup path",
    foot: open,
    label: "Open Production Bootcamp",
  },
  page: {
    eyebrow: "Music Production",
    title: "Production Bootcamp",
    blurb:
      "Reached through Mashup / Ableton Bootcamp. Shared skill tree — not split into beginner vs intermediate without a supplied division.",
    sections: [
      { type: "cards", label: "Course lanes", layout: "grid-3", group: "course" },
      { type: "cards", label: "Under production", layout: "stack", group: "under", width: "narrow" },
      {
        type: "cards",
        label: "Shared skills · not assigned to beginner vs intermediate",
        layout: "grid",
        group: "skill",
        count: "topic",
        foot: "Open details →",
      },
    ],
  },
  children: [
    course({ id: "prod-beginner", title: "Production Beginner", foot: "Course" }),
    course({ id: "prod-intermediate", title: "Production Intermediate", foot: "Course" }),
    course({
      id: "prod-finishing",
      title: "Track Finishing Group",
      foot: "Working title",
      accent: true,
      note: "For producers who already know production. Group schedule, finish tracks, accountability.",
    }),
    {
      id: "mixing",
      slug: ["mixing"],
      crumb: "Mixing & Mastering",
      group: "under",
      curriculum: null,
      card: {
        title: "Mixing and Mastering",
        sub: "Under Music Production. Curriculum details not supplied yet.",
        foot: "Curriculum later",
        label: "Open Mixing and Mastering",
      },
      page: {
        eyebrow: "Music Production",
        title: "Mixing and Mastering",
        blurb: "Under Music Production. Curriculum details not supplied yet.",
        sections: [
          {
            type: "group",
            width: "narrow",
            sections: [
              {
                type: "panel",
                title: "Mixing and Mastering",
                sub: "Lives under Music Production — not a separate top-level branch.",
                foot: "Curriculum not supplied",
              },
              { type: "note", strong: "No invented modules.", text: "Show placement only until curriculum is supplied." },
            ],
          },
        ],
      },
      children: [],
    },
    ...productionSkills.map(([id, title, items]) =>
      listed({
        id,
        title,
        slug: ["skill", id],
        group: "skill",
        items,
        eyebrow: "Music Production",
        blurb: "Shared production skill — not assigned to a specific course level.",
        foot: "Shared skill tree",
      }),
    ),
  ],
};

const dj: SkillNode = {
  id: "dj",
  slug: ["dj"],
  crumb: "DJ",
  card: { title: "DJ", sub: "Advanced · mashup · production", foot: open, label: "Open DJ" },
  mapFlow: { left: "advanced-dj", right: "mashup", hang: "production" },
  page: {
    eyebrow: "DJ",
    title: "DJ Path",
    blurb: "DJ path into Advanced DJ and Mashup / Ableton, with Production Bootcamp under Mashup.",
    sections: [
      {
        type: "group",
        width: "hub",
        sections: [
          { type: "cards", layout: "stack", ids: ["dj-bootcamp"] },
          { type: "flow" },
        ],
      },
    ],
  },
  children: [djBootcamp, advancedDj, mashup, production],
};

/**
 * The map. Four top branches. DJ’s children are the bootcamp, Advanced DJ,
 * Mashup, and Production. Production is drawn under Mashup. Nothing sits above DJ.
 */
export const skillTree: SkillNode = {
  id: "overview",
  slug: [],
  crumb: "Overview",
  card: { title: "JSTDRMN Academy" },
  hint: "Overview shows branches only · details open after you click",
  children: [community, dj, branding, education],
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
  if (!node.mapFlow) return [];
  const ids = [node.mapFlow.left, node.mapFlow.right, node.mapFlow.hang].filter((id): id is string => Boolean(id));
  return ids.map((id) => childById(node, id)).filter((item): item is SkillNode => Boolean(item));
}

function matchShortcut(parts: readonly string[], node: SkillNode = skillTree): SkillNode[] | null {
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
export function stackFromSlug(slug: readonly string[] | undefined): SkillNode[] | null {
  const parts = slug ?? [];
  if (parts.some((part) => part.length === 0)) return null;
  if (parts.length === 0) return [skillTree];
  const nested = matchChildren(skillTree, parts);
  if (nested) return [skillTree, ...nested];
  const shortcut = matchShortcut(parts);
  if (shortcut) return [skillTree, ...shortcut];
  return null;
}

/** Inverse of stackFromSlug. The overview is an empty slug. */
export function slugFromStack(stack: readonly SkillNode[]): string[] | null {
  if (stack.length === 0 || stack[0]?.id !== skillTree.id) return null;
  const slug: string[] = [];
  for (let index = 1; index < stack.length; index += 1) {
    const node = stack[index];
    const previous = stack[index - 1];
    if (!node) return null;
    const segments = previous?.id === skillTree.id && node.fromOverview ? node.fromOverview : node.slug;
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
