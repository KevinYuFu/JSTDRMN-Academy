import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SEED_VERSION = "1";

async function main() {
  const existing = await prisma.meta.findUnique({ where: { key: "seed" } });
  if (existing?.value === SEED_VERSION) {
    console.log("Seed already applied.");
    return;
  }

  await prisma.$transaction([
    prisma.comment.deleteMany(),
    prisma.progress.deleteMany(),
    prisma.checkout.deleteMany(),
    prisma.entitlement.deleteMany(),
    prisma.pendingGrant.deleteMany(),
    prisma.hubspotLog.deleteMany(),
    prisma.lesson.deleteMany(),
    prisma.cohort.deleteMany(),
    prisma.course.deleteMany(),
    prisma.session.deleteMany(),
    prisma.user.deleteMany(),
    prisma.meta.deleteMany(),
  ]);

  const [yuHash, mayaHash, jordanHash] = await Promise.all([
    hash("boothlights", 10),
    hash("headliner", 10),
    hash("cohort6", 10),
  ]);

  await prisma.user.createMany({
    data: [
      { id: "usr_yu", email: "yu@jstdrmn.com", name: "Yu", passwordHash: yuHash, role: "teacher" },
      { id: "usr_maya", email: "maya@jstdrmn.com", name: "Maya Chen", passwordHash: mayaHash, role: "student" },
      { id: "usr_jordan", email: "jordan@jstdrmn.com", name: "Jordan Blake", passwordHash: jordanHash, role: "student" },
    ],
  });

  await prisma.course.createMany({
    data: [
      {
        id: "crs_tutorials",
        slug: "tutorials",
        title: "Headliner Tutorials",
        tagline: "Booth videos on rotation",
        description: "A subset of the existing tutorial library. Headliner unlocks the marked lessons. The rest stay outside the membership.",
        kind: "tutorial_library",
        access: "headliner",
        priceCents: null,
        billing: "monthly",
        statusLabel: "Membership",
        panel: "purple",
        sort: 0,
      },
      {
        id: "crs_mixing",
        slug: "club-mixing",
        title: "Foundations of Club Mixing",
        tagline: "One course, yours to keep",
        description: "Signal flow, EQ, phrasing, and a 45-minute open. A one-time purchase. It does not include Headliner or a bootcamp seat.",
        kind: "course",
        access: "purchase",
        priceCents: 5000,
        billing: "once",
        statusLabel: "One-time",
        panel: "studio",
        sort: 1,
      },
      {
        id: "crs_ash",
        slug: "ash-f-b2b",
        title: "Ash F: The Business of the Dancefloor",
        tagline: "Guest series with Ash F",
        description: "Bookings, rates, and playing back-to-back. A separate $50/month add-on hosted by Ash F. Headliner does not include it.",
        kind: "subscription_course",
        access: "ash_subscription",
        priceCents: 5000,
        billing: "monthly",
        statusLabel: "Add-on",
        panel: "ash",
        sort: 2,
      },
      {
        id: "crs_dj",
        slug: "dj-bootcamp",
        title: "DJ Bootcamp",
        tagline: "Waitlist Open",
        description: "Master the decks and take your mixing skills to the next level! Learn, practice, and unleash your sound with guidance from industry pros.",
        kind: "bootcamp",
        access: "cohort",
        priceCents: null,
        billing: "application",
        statusLabel: "Waitlist Open",
        hubspotUrl: "https://www.jstdrmn.com/bootcamp",
        panel: "decks",
        sort: 3,
      },
      {
        id: "crs_prod",
        slug: "production-bootcamp",
        title: "Production Bootcamp",
        tagline: "Waitlist Open",
        description: "Turn your ideas into tracks that hit! Get hands-on with production tools and techniques to bring your music to life.",
        kind: "bootcamp",
        access: "cohort",
        priceCents: null,
        billing: "application",
        statusLabel: "Waitlist Open",
        hubspotUrl: "https://www.jstdrmn.com/bootcamp",
        panel: "studio",
        sort: 4,
      },
      {
        id: "crs_mash",
        slug: "mashup-bootcamp",
        title: "Mashup Bootcamp",
        tagline: "Applications Open",
        description: "Ready to take your DJ career to the next level? Learn to produce professional mashups in Ableton Live.",
        kind: "bootcamp",
        access: "cohort",
        priceCents: null,
        billing: "application",
        statusLabel: "Applications Open",
        hubspotUrl: "https://www.jstdrmn.com/bootcamp",
        panel: "stripes",
        sort: 5,
      },
    ],
  });

  await prisma.cohort.createMany({
    data: [
      { id: "coh_dj5", courseId: "crs_dj", slug: "cohort-5", name: "Cohort 5", startsLabel: "Winter 2026 · closed", sort: 5 },
      { id: "coh_dj6", courseId: "crs_dj", slug: "cohort-6", name: "Cohort 6", startsLabel: "Fall 2026 · in session", sort: 6 },
    ],
  });

  const lesson = (
    id: string,
    courseId: string,
    cohortId: string | null,
    position: number,
    title: string,
    summary: string,
    durationMin: number,
    runtimeLabel: string,
    extra: { headliner?: boolean; drip?: boolean; slidesTitle?: string; slidesMeta?: string } = {},
  ) => ({
    id,
    courseId,
    cohortId,
    position,
    title,
    summary,
    durationMin,
    runtimeLabel,
    videoProvider: "mock",
    videoUrl: `mock://${id}`,
    slidesTitle: extra.slidesTitle ?? `Slides: ${title}`,
    slidesMeta: extra.slidesMeta ?? "PDF · lesson handout",
    headliner: extra.headliner ?? false,
    drip: extra.drip ?? false,
  });

  await prisma.lesson.createMany({
    data: [
      lesson("les_gain", "crs_tutorials", null, 1, "Gain Staging for the Club", "Set the channel fader at unity before you touch the trim.\nIf the booth is already hot, pull the master, not the track.", 14, "14:10", { headliner: true, slidesMeta: "PDF · 10 slides · 1.4 MB" }),
      lesson("les_headphones", "crs_tutorials", null, 2, "Mixing in Headphones", "Cue at a level you can still hear the room under.\nMatch kicks in the phones, then confirm on the floor for one phrase.", 15, "15:00", { headliner: true }),
      lesson("les_crowd", "crs_tutorials", null, 3, "Reading a Friday Crowd", "Watch the bar line and the edges of the dancefloor, not your screen.\nIf the hands drop on the breakdown, you went too deep too early.", 18, "18:05", { headliner: true }),
      lesson("les_harmonic", "crs_tutorials", null, 4, "Harmonic Mixing Without a Key Detector", "This tape sits outside Headliner.\nUse your ear on the bass notes, then check the vocal clash in headphones.", 22, "22:18"),
      lesson("les_record", "crs_tutorials", null, 5, "Recording a Set for SoundCloud", "This tape sits outside Headliner.\nRecord the booth feed, not the phone mic, and leave the first minute in.", 16, "16:40"),
      lesson("les_signal", "crs_mixing", null, 1, "The Signal Chain", "Deck, mixer, booth, PA. Name every knob you can touch before the doors open.", 16, "16:12", { slidesMeta: "PDF · 14 slides · 2.1 MB" }),
      lesson("les_eqmix", "crs_mixing", null, 2, "EQ That Doesn't Kill the Kick", "Swap bass, don't stack it. The incoming kick earns the low end over four bars.", 19, "19:04"),
      lesson("les_phrase", "crs_mixing", null, 3, "Phrase Mixing", "Count 8, 16, 32. If you can't sing the phrase, you aren't ready to blend it.", 17, "17:30"),
      lesson("les_open", "crs_mixing", null, 4, "Building a 45-Minute Open", "Start where the room is, not where you want it. Save the anthem for someone else's peak.", 21, "21:15"),
      lesson("les_close", "crs_mixing", null, 5, "Closing a Room", "Bring the energy down without emptying the floor. Last track, lights up, no encore surprise.", 12, "12:48"),
      lesson("les_booked", "crs_ash", null, 1, "Why Promoters Book You Twice", "Ash F on the difference between a good set and a DJ they text again on Monday.", 20, "20:11", { slidesMeta: "PDF · 16 slides · 2.4 MB" }),
      lesson("les_rates", "crs_ash", null, 2, "Rates, Riders, and the Awkward Email", "Write the number once. Say what it includes. Don't negotiate against yourself in the same thread.", 18, "18:22"),
      lesson("les_content", "crs_ash", null, 3, "Content That Fills a Room", "Film the room, not your jog wheel. Post the moment people already felt.", 15, "15:36"),
      lesson("les_b2b", "crs_ash", null, 4, "Playing B2B Without Stepping on the Other DJ", "Agree the handoff before you get on. One of you talks to the booth, not both.", 24, "24:02"),
      lesson("les_decks", "crs_dj", "coh_dj6", 1, "Meet the Decks", "Power, needles or CDJs, and the mixer you will actually use this cohort.", 12, "12:00", { slidesMeta: "PDF · 18 slides · 2.8 MB" }),
      lesson("les_phrasing", "crs_dj", "coh_dj6", 2, "Phrasing & Song Structure", "Find the 1. Mark the chorus. Know when the kick comes back.", 15, "15:00"),
      lesson("les_beat", "crs_dj", "coh_dj6", 3, "Beatmatching", "Pitch fader for the big move. Platter for the last few percent.\nStay inside six percent or drop a fresh cue.\nMatch the kick before you touch the EQ.", 19, "18:42", { slidesTitle: "Slides: Beatmatching by Ear", slidesMeta: "PDF · 24 slides · 3.2 MB" }),
      lesson("les_eqtrans", "crs_dj", "coh_dj6", 4, "EQ & Transitions", "Bass swap, then mids if the vocals fight. Leave the highs alone until the phrase ends.", 21, "21:00"),
      lesson("les_fx", "crs_dj", "coh_dj6", 5, "Effects & Loops", "A loop is a tool, not a personality. Filter sweeps once a night, not once a track.", 17, "17:00"),
      lesson("les_set", "crs_dj", "coh_dj6", 6, "Building Your First Set", "Sequence an opening hour from the tracks you already have. This one waits until the earlier lessons are done.", 25, "25:00", { drip: true, slidesMeta: "PDF · 20 slides · 2.6 MB" }),
      lesson("les_c5_setup", "crs_dj", "coh_dj5", 1, "Deck Setup in a Cold Room", "Cohort 5 archive. Warm the gear, check the booth polarity, then play.", 13, "13:20"),
      lesson("les_c5_cdj", "crs_dj", "coh_dj5", 2, "Beatmatching on CDJs", "Same ear, different platters. Jog sensitivity is not a moral failing.", 18, "18:10"),
      lesson("les_c5_loud", "crs_dj", "coh_dj5", 3, "EQ in a Loud Room", "If you can't hear the bass clash, trust the meters and a short headphone check.", 16, "16:44"),
      lesson("les_c5_open", "crs_dj", "coh_dj5", 4, "Your First Opening Set", "Cohort 5's closing assignment. Keep it under an hour.", 11, "11:05"),
    ],
  });

  await prisma.entitlement.createMany({
    data: [
      { userId: "usr_maya", product: "headliner", status: "active", source: "seed" },
      { userId: "usr_jordan", product: "course", courseId: "crs_mixing", status: "active", source: "seed" },
      { userId: "usr_jordan", product: "cohort", courseId: "crs_dj", cohortId: "coh_dj6", status: "active", source: "seed" },
    ],
  });

  await prisma.progress.createMany({
    data: [
      { userId: "usr_maya", lessonId: "les_gain", status: "completed" },
      { userId: "usr_maya", lessonId: "les_headphones", status: "in_progress" },
      { userId: "usr_jordan", lessonId: "les_decks", status: "completed" },
      { userId: "usr_jordan", lessonId: "les_phrasing", status: "completed" },
      { userId: "usr_jordan", lessonId: "les_beat", status: "in_progress" },
    ],
  });

  const jordanNote = await prisma.comment.create({
    data: {
      id: "cmt_jordan_beat",
      lessonId: "les_beat",
      userId: "usr_jordan",
      body: "The part about nudging the jog wheel versus the pitch fader — I keep overshooting. Is there a tempo range where I should just restart the cue?",
      createdAt: new Date("2026-10-02T15:04:00Z"),
    },
  });
  await prisma.comment.create({
    data: {
      lessonId: "les_beat",
      userId: "usr_yu",
      parentId: jordanNote.id,
      body: "Stay under ±6% and ride the platter, not the fader, once you're inside the phrase. If you're chasing more than that, drop the cue on the next 1.",
      createdAt: new Date("2026-10-03T18:22:00Z"),
    },
  });
  await prisma.comment.create({
    data: {
      lessonId: "les_gain",
      userId: "usr_maya",
      body: "Does this change if the booth monitors are already hot before I touch the trim?",
      createdAt: new Date("2026-10-07T21:10:00Z"),
    },
  });

  await prisma.meta.create({ data: { key: "seed", value: SEED_VERSION } });
  console.log("Seeded JSTDRMN Academy.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
