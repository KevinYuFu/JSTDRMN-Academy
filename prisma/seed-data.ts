import type { Prisma } from "@prisma/client";
import { googleCalendarUrl, parseToronto } from "../lib/events";

/**
 * Placeholder curriculum for DJ Bootcamp.
 * Each lesson is one module from the current mock catalog. Videos stay on mock:// until a real file is added.
 * Teacher and admin have the same staff access. This account uses role "teacher".
 */
export const seedAdmin = {
  id: "usr_yu",
  email: "yu@jstdrmn.com",
  name: "Yu",
  role: "teacher",
};

export const djBootcamp = {
  id: "crs_dj",
  slug: "dj-bootcamp",
  title: "DJ Bootcamp",
  tagline: "Master the decks and take your mixing skills to the next level.",
  description:
    "Master the decks and take your mixing skills to the next level! Learn, practice, and unleash your sound with guidance from industry pros.",
  kind: "bootcamp",
  access: "cohort",
  priceCents: null,
  billing: "application",
  statusLabel: "Waitlist Open",
  hubspotUrl: "https://www.jstdrmn.com/bootcamp",
  panel: "decks",
  sort: 3,
  placement: "grid",
  special: false,
  presenter: null,
} satisfies Prisma.CourseUncheckedCreateInput;

export const djCohorts = [
  {
    id: "coh_dj5",
    courseId: djBootcamp.id,
    slug: "cohort-5",
    name: "Cohort 5",
    startsLabel: "Winter 2026 · closed",
    sort: 5,
  },
  {
    id: "coh_dj6",
    courseId: djBootcamp.id,
    slug: "cohort-6",
    name: "Cohort 6",
    startsLabel: "Fall 2026 · in session",
    sort: 6,
  },
] satisfies Prisma.CohortUncheckedCreateInput[];

type LessonSeed = Prisma.LessonUncheckedCreateInput;

function lesson(
  id: string,
  cohortId: string,
  position: number,
  title: string,
  summary: string,
  durationMin: number,
  runtimeLabel: string,
  extra: { drip?: boolean; slidesTitle?: string; slidesMeta?: string } = {},
): LessonSeed {
  return {
    id,
    courseId: djBootcamp.id,
    cohortId,
    trackId: null,
    position,
    title,
    summary,
    durationMin,
    runtimeLabel,
    videoProvider: "mock",
    videoUrl: `mock://${id}`,
    slidesTitle: extra.slidesTitle ?? null,
    slidesMeta: extra.slidesMeta ?? null,
    headliner: false,
    drip: extra.drip ?? false,
  };
}

export const djLessons = [
  lesson("les_decks", "coh_dj6", 1, "Meet the Decks", "Power, needles or CDJs, and the mixer you will actually use this cohort.", 12, "12:00", {
    slidesTitle: "Slides: Meet the Decks",
    slidesMeta: "PDF · 18 slides · 2.8 MB",
  }),
  lesson("les_phrasing", "coh_dj6", 2, "Phrasing & Song Structure", "Find the 1. Mark the chorus. Know when the kick comes back.", 15, "15:00", {
    slidesTitle: "Slides: Phrasing & Song Structure",
    slidesMeta: "PDF · lesson handout",
  }),
  lesson(
    "les_beat",
    "coh_dj6",
    3,
    "Beatmatching",
    "Pitch fader for the big move. Platter for the last few percent.\nStay inside six percent or drop a fresh cue.\nMatch the kick before you touch the EQ.",
    19,
    "18:42",
    { slidesTitle: "Slides: Beatmatching by Ear", slidesMeta: "PDF · 24 slides · 3.2 MB" },
  ),
  lesson(
    "les_eqtrans",
    "coh_dj6",
    4,
    "EQ & Transitions",
    "Bass swap, then mids if the vocals fight. Leave the highs alone until the phrase ends.",
    21,
    "21:00",
    { slidesTitle: "Slides: EQ & Transitions", slidesMeta: "PDF · lesson handout" },
  ),
  lesson("les_fx", "coh_dj6", 5, "Effects & Loops", "A loop is a tool, not a personality. Filter sweeps once a night, not once a track.", 17, "17:00", {
    slidesTitle: "Slides: Effects & Loops",
    slidesMeta: "PDF · lesson handout",
  }),
  lesson(
    "les_set",
    "coh_dj6",
    6,
    "Building Your First Set",
    "Sequence an opening hour from the tracks you already have. This one waits until the earlier lessons are done.",
    25,
    "25:00",
    { drip: true, slidesTitle: "Slides: Building Your First Set", slidesMeta: "PDF · 20 slides · 2.6 MB" },
  ),
  lesson("les_c5_setup", "coh_dj5", 1, "Deck Setup in a Cold Room", "Cohort 5 archive. Warm the gear, check the booth polarity, then play.", 13, "13:20", {
    slidesTitle: "Slides: Deck Setup in a Cold Room",
    slidesMeta: "PDF · lesson handout",
  }),
  lesson("les_c5_cdj", "coh_dj5", 2, "Beatmatching on CDJs", "Same ear, different platters. Jog sensitivity is not a moral failing.", 18, "18:10", {
    slidesTitle: "Slides: Beatmatching on CDJs",
    slidesMeta: "PDF · lesson handout",
  }),
  lesson(
    "les_c5_loud",
    "coh_dj5",
    3,
    "EQ in a Loud Room",
    "If you can't hear the bass clash, trust the meters and a short headphone check.",
    16,
    "16:44",
    { slidesTitle: "Slides: EQ in a Loud Room", slidesMeta: "PDF · lesson handout" },
  ),
  lesson("les_c5_open", "coh_dj5", 4, "Your First Opening Set", "Cohort 5's closing assignment. Keep it under an hour.", 11, "11:05", {
    slidesTitle: "Slides: Your First Opening Set",
    slidesMeta: "PDF · lesson handout",
  }),
] satisfies LessonSeed[];

function mustDate(local: string) {
  const date = parseToronto(local);
  if (!date) throw new Error(`Seed date is not valid: ${local}`);
  return date;
}

const syncStart = mustDate("2026-10-20T16:00");
const syncEnd = mustDate("2026-10-20T17:00");
const feedbackStart = mustDate("2026-10-21T18:00");

export const sampleEventTypes = [
  {
    id: "etype_connect",
    slug: "community-connect",
    name: "Community Connect",
    actionType: "link",
    actionUrl: "https://discord.com/channels/jstdrmn/community-connect",
    buttonLabel: "Join",
    sort: 1,
    active: true,
  },
  {
    id: "etype_green",
    slug: "green-room",
    name: "Green Room",
    actionType: "link",
    actionUrl: "https://zoom.us/j/jstdrmn-green-room",
    buttonLabel: "Join Zoom",
    sort: 2,
    active: true,
  },
  {
    id: "etype_sync",
    slug: "sync",
    name: "Sync",
    actionType: "calendar",
    actionUrl: googleCalendarUrl({
      title: "Sync",
      description: "Bring one loop you want heard.",
      start: syncStart,
      end: syncEnd,
    }),
    buttonLabel: "Add to calendar",
    sort: 3,
    active: true,
  },
  {
    id: "etype_feedback",
    slug: "production-feedback",
    name: "Production Feedback",
    actionType: "link",
    actionUrl: "https://discord.com/channels/jstdrmn/production-feedback",
    buttonLabel: "Join",
    sort: 4,
    active: true,
  },
] satisfies Prisma.EventTypeUncheckedCreateInput[];

export const sampleEvents = [
  {
    id: "evt_connect",
    slug: "community-connect",
    title: "Community Connect",
    description: "A weekly hang for the academy. Say what you’re working on.",
    typeId: "etype_connect",
    startsAt: mustDate("2026-10-22T19:00"),
    endsAt: mustDate("2026-10-22T20:00"),
    recurrence: "weekly",
    audience: "all",
    cohortId: null,
    active: true,
    cancelled: false,
    actionType: null,
    actionUrl: null,
    buttonLabel: null,
  },
  {
    id: "evt_green",
    slug: "green-room",
    title: "Green Room",
    description: "Headliners on Zoom. One hour, cameras optional.",
    typeId: "etype_green",
    startsAt: mustDate("2026-10-24T20:00"),
    endsAt: mustDate("2026-10-24T21:30"),
    recurrence: "",
    audience: "headliners",
    cohortId: null,
    active: true,
    cancelled: false,
    actionType: null,
    actionUrl: null,
    buttonLabel: null,
  },
  {
    id: "evt_sync",
    slug: "sync",
    title: "Sync",
    description: "Bring one loop you want heard.",
    typeId: "etype_sync",
    startsAt: syncStart,
    endsAt: syncEnd,
    recurrence: "",
    audience: "all",
    cohortId: null,
    active: true,
    cancelled: false,
    actionType: null,
    actionUrl: null,
    buttonLabel: null,
  },
  {
    id: "evt_feedback",
    slug: "production-feedback",
    title: "Production Feedback",
    description: "Weekly listen for producers. Change the day here and the Events page follows.",
    typeId: "etype_feedback",
    startsAt: feedbackStart,
    endsAt: mustDate("2026-10-21T19:00"),
    recurrence: "weekly",
    audience: "producers",
    cohortId: null,
    active: true,
    cancelled: false,
    actionType: null,
    actionUrl: null,
    buttonLabel: null,
  },
] satisfies Prisma.EventUncheckedCreateInput[];
