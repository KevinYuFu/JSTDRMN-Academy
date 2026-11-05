/**
 * Skill Tree content and routes.
 *
 * Copy and relationships come from the designer's clickable prototype
 * (the handoff HTML). Do not add modules, lessons, or branches that
 * are not in that file. Curriculum that was not supplied stays `null`.
 *
 * Temporary name and route — Yu has not picked a final name.
 * - Change `skillTreeNav.label` to rename the nav item and the on-page label.
 * - Change `skillTreeNav.href` and move `app/skill-tree` together if the path changes.
 */

export const skillTreeNav = {
  key: "skill-tree",
  label: "Skill Tree",
  href: "/skill-tree",
} as const;

export type SkillTreeView =
  | "overview"
  | "community"
  | "branding"
  | "education"
  | "dj"
  | "advanced-dj"
  | "dj-bootcamp"
  | "dj-skill"
  | "mashup"
  | "production"
  | "prod-course"
  | "prod-skill"
  | "mix-master";

export type SkillTreeStep = {
  name: string;
  view: SkillTreeView;
  payload?: string;
};

export type SkillItem = {
  id: string;
  title: string;
  items: readonly string[];
};

export type PendingBranch = {
  id: "community" | "branding" | "education";
  eyebrow: string;
  heading: string;
  panelTitle: string;
  purpose: string;
  status: string;
  requiredForTeachers: boolean;
  /** Null means the curriculum was not supplied. Leave it null. */
  curriculum: null;
};

export type FlowNode = {
  id: string;
  title: string;
  sub: string;
  accent?: boolean;
  label: string;
  step: SkillTreeStep;
  child?: FlowNode;
};

export type OverviewBranch = {
  id: "community" | "dj" | "branding" | "education";
  title: string;
  sub: string;
  accent?: boolean;
  label: string;
  step: SkillTreeStep;
  /** Tight flowchart drawn under this card. Only DJ has one. */
  flow?: { left: FlowNode; right: FlowNode };
};

export const overviewStep: SkillTreeStep = { name: "Overview", view: "overview" };
export const communityStep: SkillTreeStep = { name: "Community Events", view: "community" };
export const brandingStep: SkillTreeStep = { name: "Branding", view: "branding" };
export const educationStep: SkillTreeStep = { name: "Education", view: "education" };
export const djStep: SkillTreeStep = { name: "DJ", view: "dj" };
export const advancedDjStep: SkillTreeStep = { name: "Advanced DJ", view: "advanced-dj" };
export const djBootcampStep: SkillTreeStep = { name: "DJ Bootcamp", view: "dj-bootcamp" };
export const mashupStep: SkillTreeStep = { name: "Mashup / Ableton", view: "mashup" };
export const productionStep: SkillTreeStep = { name: "Production Bootcamp", view: "production" };
export const mixMasterStep: SkillTreeStep = { name: "Mixing & Mastering", view: "mix-master" };

export const copy = {
  hint: "Overview shows branches only · details open after you click",
  open: "Open →",
  openDetails: "Open details →",
  back: "← Back",
  coreFoundations: "Core foundations",
  skillCategories: "Skill categories · click for details",
  courseLanes: "Course lanes",
  underProduction: "Under production",
  sharedSkills: "Shared skills · not assigned to beginner vs intermediate",
  noInventedCurriculum: "No invented curriculum.",
  workingTitleLead: "Working title.",
  skillPlacementLead: "Skill placement:",
  skillPlacementBody:
    "Production skills stay on the shared tree. Do not invent beginner / intermediate module lists.",
  noInventedModules: "No invented modules.",
  mixPlacementBody: "Show placement only until curriculum is supplied.",
  taughtInBootcamp: "Taught in the bootcamp",
  coreDjSkills: "Core DJ Skills",
  djSkillIntro: "Skill details for this category.",
  prodSkillIntro: "Shared production skill — not assigned to a specific course level.",
  sharedSkillTree: "Shared skill tree",
  courseLaneIntro: "Course lane inside Music Production. Shared skills stay on the production tree.",
  courseLaneSub: "Course lane · skills shared below",
  knownCourseLane: "Known as a production course lane.",
  mashupFocus: "Mashup focus",
  mashupCovers: "What this bootcamp covers",
  leadsToProduction: "Leads into Music Production",
  curriculumLater: "Curriculum later",
  curriculumNotSupplied: "Curriculum not supplied",
  mixLivesUnder: "Lives under Music Production — not a separate top-level branch.",
  workingTitleSub: "Working title",
  academyTitle: "JSTDRMN Academy",
} as const;

export function skillCount(count: number) {
  return `${count} skill${count === 1 ? "" : "s"}`;
}

export function topicCount(count: number) {
  return `${count} topic${count === 1 ? "" : "s"}`;
}

export const pendingBranches: Record<PendingBranch["id"], PendingBranch> = {
  community: {
    id: "community",
    eyebrow: "Community Events",
    heading: "Community Events",
    panelTitle: "Community Events",
    purpose: "Bringing producers and Dreamers together through shared events and community touchpoints.",
    status: "Details coming later. Purpose only for now.",
    requiredForTeachers: false,
    curriculum: null,
  },
  branding: {
    id: "branding",
    eyebrow: "Branding",
    heading: "Branding",
    panelTitle: "Branding",
    purpose: "Artist identity and brand development for Dreamers building a public presence.",
    status: "Details coming later. Purpose only for now.",
    requiredForTeachers: false,
    curriculum: null,
  },
  education: {
    id: "education",
    eyebrow: "Education",
    heading: "Instructor Training",
    panelTitle: "Required to teach",
    purpose: "Required training for anyone who wants to teach at JSTDRMN Academy.",
    status: "Requirement confirmed. Course modules not written yet — not invented here.",
    requiredForTeachers: true,
    curriculum: null,
  },
};

export const advancedDj = {
  title: "Advanced DJ",
  purpose: "Placeholder for advanced DJ programming beyond the current simplified map.",
  status: "Working title — tentative. Curriculum not supplied yet.",
  curriculum: null,
} as const;

export const djPath = {
  eyebrow: "DJ",
  heading: "DJ Path",
  purpose: "DJ path into Advanced DJ and Mashup / Ableton, with Production Bootcamp under Mashup.",
} as const;

export const djBootcamp = {
  title: "DJ Bootcamp",
  blurb: "Standalone DJ training — crate craft, culture, and clean AV setup.",
  core: ["Crate building & basics", "Genre mixing styles & culture", "AV equipment connections & clean cabling"],
  categories: [
    { id: "library", title: "Library", items: ["Library curation", "Library management"] },
    {
      id: "transitions",
      title: "Transitions",
      items: [
        "Beat / phrase alignment",
        "Reverb / echo",
        "Phaser / flanger / filter",
        "Loops",
        "Stems",
        "Scratching",
        "Doubles",
      ],
    },
    { id: "set-curation", title: "Set Curation", items: ["Right vibe for the crowd"] },
    { id: "edits", title: "Edits", items: ["Song edits"] },
    { id: "crowd-work", title: "Crowd Work", items: ["Reading and working the room"] },
    { id: "career", title: "Career Growth", items: ["Residency", "Networking"] },
  ],
} as const;

export const mashup = {
  title: "Mashup / Ableton Bootcamp",
  blurb: "Build mashups in Ableton and ship a release.",
  items: [
    { label: "Ableton basics", hot: false },
    { label: "Stem splitting", hot: false },
    { label: "Editing", hot: false },
    { label: "Mix / master mashups", hot: false },
    { label: "SoundCloud release", hot: true },
  ],
} as const;

export const productionCourses = [
  { id: "prod-beginner", title: "Production Beginner", foot: "Course", accent: false, note: null },
  { id: "prod-intermediate", title: "Production Intermediate", foot: "Course", accent: false, note: null },
  {
    id: "prod-finishing",
    title: "Track Finishing Group",
    foot: "Working title",
    accent: true,
    note: "For producers who already know production. Group schedule, finish tracks, accountability.",
  },
] as const;

export const mixMaster = {
  title: "Mixing and Mastering",
  status: "Under Music Production. Curriculum details not supplied yet.",
  curriculum: null,
} as const;

export const production = {
  title: "Production Bootcamp",
  eyebrow: "Music Production",
  blurb:
    "Reached through Mashup / Ableton Bootcamp. Shared skill tree — not split into beginner vs intermediate without a supplied division.",
  courses: productionCourses,
  mixMaster,
  skills: [
    { id: "daw", title: "DAW", items: ["Audio manipulation", "MIDI", "Automation", "Routing", "File management"] },
    {
      id: "theory",
      title: "Music Theory",
      items: ["Rhythm / counting", "Scales & chords", "Arrangement & phrasing", "Tension & release", "Call & response"],
    },
    { id: "cinema", title: "Cinema / FX", items: ["Risers", "Impacts", "Atmosphere", "Layering"] },
    {
      id: "audio-fx",
      title: "Audio FX",
      items: [
        "Utility",
        "EQ",
        "Dynamics",
        "Limiter",
        "Multiband",
        "Filter",
        "Reverb",
        "Delay",
        "Chorus",
        "Autopan",
        "Waveshapers",
        "OTT",
        "Phaser / Flanger",
      ],
    },
    { id: "instruments", title: "Instruments", items: ["Samples & presets", "Synths", "Sound design"] },
    { id: "drums", title: "Drums", items: ["House patterns", "Breakbeat patterns", "Trap patterns", "Programming", "Dynamics"] },
  ],
} as const;

/**
 * Top of the map. Four branches, spread wide.
 * DJ's children are Advanced DJ and Mashup / Ableton only.
 * Production Bootcamp hangs under Mashup. Nothing sits above DJ.
 */
export const overviewBranches: readonly OverviewBranch[] = [
  {
    id: "community",
    title: "Community",
    sub: "Events · gather and connect",
    label: "Open Community Events",
    step: communityStep,
  },
  {
    id: "dj",
    title: "DJ",
    sub: "Advanced · mashup · production",
    label: "Open DJ",
    step: djStep,
    flow: {
      left: {
        id: "advanced-dj",
        title: "Advanced DJ",
        sub: "Working title",
        accent: true,
        label: "Open Advanced DJ",
        step: advancedDjStep,
      },
      right: {
        id: "mashup",
        title: "Mashup / Ableton Bootcamp",
        sub: "Stems, edits, release",
        label: "Open Mashup Ableton Bootcamp",
        step: mashupStep,
        child: {
          id: "production",
          title: "Production Bootcamp",
          sub: "Via Mashup path",
          label: "Open Production Bootcamp",
          step: productionStep,
        },
      },
    },
  },
  {
    id: "branding",
    title: "Branding",
    sub: "Artist identity and presence",
    label: "Open Branding",
    step: brandingStep,
  },
  {
    id: "education",
    title: "Education",
    sub: "Required for teachers",
    accent: true,
    label: "Open Education",
    step: educationStep,
  },
];

export const djHubCards = {
  bootcamp: {
    title: djBootcamp.title,
    sub: djBootcamp.blurb,
    label: "Open DJ Bootcamp",
    step: djBootcampStep,
  },
  advanced: {
    title: "Advanced DJ",
    sub: "Working title · tentative",
    accent: true,
    label: "Open Advanced DJ",
    step: advancedDjStep,
  },
  mashup: {
    title: "Mashup / Ableton Bootcamp",
    sub: "Stems, edits, release",
    label: "Open Mashup Ableton Bootcamp",
    step: mashupStep,
  },
  production: {
    title: "Production Bootcamp",
    sub: "Via Mashup path · shared skills",
    label: "Open Production Bootcamp",
    step: productionStep,
  },
} as const;

export function djSkillStep(id: string): SkillTreeStep | null {
  const category = djBootcamp.categories.find((item) => item.id === id);
  if (!category) return null;
  return { name: category.title, view: "dj-skill", payload: category.id };
}

export function productionCourseStep(id: string): SkillTreeStep | null {
  const course = production.courses.find((item) => item.id === id);
  if (!course) return null;
  return { name: course.title, view: "prod-course", payload: course.id };
}

export function productionSkillStep(id: string): SkillTreeStep | null {
  const skill = production.skills.find((item) => item.id === id);
  if (!skill) return null;
  return { name: skill.title, view: "prod-skill", payload: skill.id };
}

const simpleTops: Record<string, SkillTreeStep> = {
  community: communityStep,
  branding: brandingStep,
  education: educationStep,
  "advanced-dj": advancedDjStep,
  mashup: mashupStep,
};

function parseProduction(base: SkillTreeStep[], rest: string[]): SkillTreeStep[] | null {
  if (rest.length === 0) return base;
  if (rest[0] === "mixing" && rest.length === 1) return [...base, mixMasterStep];
  if (rest[0] === "course" && rest.length === 2) {
    const step = productionCourseStep(rest[1]);
    return step ? [...base, step] : null;
  }
  if (rest[0] === "skill" && rest.length === 2) {
    const step = productionSkillStep(rest[1]);
    return step ? [...base, step] : null;
  }
  return null;
}

function parseDj(rest: string[]): SkillTreeStep[] | null {
  const base = [overviewStep, djStep];
  if (rest.length === 0) return base;
  if (rest[0] === "advanced" && rest.length === 1) return [...base, advancedDjStep];
  if (rest[0] === "mashup" && rest.length === 1) return [...base, mashupStep];
  if (rest[0] === "bootcamp") {
    const withBootcamp = [...base, djBootcampStep];
    if (rest.length === 1) return withBootcamp;
    if (rest.length === 2) {
      const step = djSkillStep(rest[1]);
      return step ? [...withBootcamp, step] : null;
    }
    return null;
  }
  if (rest[0] === "production") return parseProduction([...base, productionStep], rest.slice(1));
  return null;
}

/** Turns a URL slug into the breadcrumb stack. Unknown paths return null. */
export function stackFromSlug(slug: string[] | undefined): SkillTreeStep[] | null {
  const parts = slug ?? [];
  if (parts.some((part) => part.length === 0)) return null;
  if (parts.length === 0) return [overviewStep];
  if (parts[0] === "dj") return parseDj(parts.slice(1));
  if (parts[0] === "production") return parseProduction([overviewStep, productionStep], parts.slice(1));
  if (parts.length === 1 && simpleTops[parts[0]]) return [overviewStep, simpleTops[parts[0]]];
  return null;
}

/** Inverse of stackFromSlug. Overview is an empty slug. */
export function slugFromStack(stack: SkillTreeStep[]): string[] | null {
  if (stack.length === 0 || stack[0].view !== "overview") return null;
  const slug: string[] = [];
  for (let index = 1; index < stack.length; index += 1) {
    const step = stack[index];
    const previous = stack[index - 1];
    switch (step.view) {
      case "community":
        slug.push("community");
        break;
      case "branding":
        slug.push("branding");
        break;
      case "education":
        slug.push("education");
        break;
      case "dj":
        slug.push("dj");
        break;
      case "advanced-dj":
        slug.push(previous.view === "dj" ? "advanced" : "advanced-dj");
        break;
      case "mashup":
        slug.push("mashup");
        break;
      case "production":
        slug.push("production");
        break;
      case "dj-bootcamp":
        slug.push("bootcamp");
        break;
      case "dj-skill":
        if (!step.payload) return null;
        slug.push(step.payload);
        break;
      case "prod-course":
        if (!step.payload) return null;
        slug.push("course", step.payload);
        break;
      case "prod-skill":
        if (!step.payload) return null;
        slug.push("skill", step.payload);
        break;
      case "mix-master":
        slug.push("mixing");
        break;
      default:
        return null;
    }
  }
  return slug;
}

export function skillTreeHref(stack: SkillTreeStep[]): string {
  const slug = slugFromStack(stack);
  if (!slug || slug.length === 0) return skillTreeNav.href;
  return `${skillTreeNav.href}/${slug.join("/")}`;
}

export function drillHref(stack: SkillTreeStep[], step: SkillTreeStep): string {
  return skillTreeHref([...stack, step]);
}

export function parentHref(stack: SkillTreeStep[]): string | null {
  if (stack.length < 2) return null;
  return skillTreeHref(stack.slice(0, -1));
}
