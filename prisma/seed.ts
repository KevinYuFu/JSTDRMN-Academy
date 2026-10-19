import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { googleCalendarUrl, parseToronto } from "../lib/events";

const prisma = new PrismaClient();
const SEED_VERSION = "6";

async function main() {
  const existing = await prisma.meta.findUnique({ where: { key: "seed" } });
  if (existing?.value === SEED_VERSION) {
    console.log("Seed already applied.");
    return;
  }

  await prisma.$transaction([
    prisma.announcement.deleteMany(),
    prisma.event.deleteMany(),
    prisma.eventType.deleteMany(),
    prisma.sessionRequest.deleteMany(),
    prisma.mentor.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.progress.deleteMany(),
    prisma.checkout.deleteMany(),
    prisma.entitlement.deleteMany(),
    prisma.pendingGrant.deleteMany(),
    prisma.hubspotLog.deleteMany(),
    prisma.lesson.deleteMany(),
    prisma.track.updateMany({ data: { parentId: null } }),
    prisma.track.deleteMany(),
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
        id: "crs_headliner",
        slug: "headliner",
        title: "Headliner",
        tagline: "One subscription. You keep access for as long as you keep paying.",
        description:
          "The academy path: a welcome, an introduction to EDM, and the progression tree into branding, DJing, producing, and mashups.",
        kind: "membership",
        access: "headliner",
        priceCents: null,
        billing: "monthly",
        statusLabel: "Membership",
        panel: "purple",
        sort: 0,
        placement: "banner",
        special: false,
      },
      {
        id: "crs_mixing",
        slug: "club-mixing",
        title: "Foundations of Club Mixing",
        tagline: "Signal flow, EQ, phrasing, and a 45-minute open.",
        description:
          "Signal flow, EQ, phrasing, and a 45-minute open. A one-time purchase. It does not include Headliner or a bootcamp seat.",
        kind: "course",
        access: "purchase",
        priceCents: 5000,
        billing: "once",
        statusLabel: "Open",
        panel: "studio",
        sort: 1,
        placement: "grid",
        special: false,
      },
      {
        id: "crs_fb2b",
        slug: "fb2b",
        title: "FB2B",
        tagline: "From Bedroom to Banger.",
        description: "Lessons for this program will be added here.",
        kind: "program",
        access: "subscription",
        priceCents: 5000,
        billing: "monthly",
        statusLabel: "Special offering",
        panel: "ash",
        sort: 2,
        placement: "grid",
        special: true,
        presenter: "Ash F",
      },
      {
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
      },
      {
        id: "crs_prod",
        slug: "production-bootcamp",
        title: "Production Bootcamp",
        tagline: "Turn your ideas into tracks that hit.",
        description: "Turn your ideas into tracks that hit! Get hands-on with production tools and techniques to bring your music to life.",
        kind: "bootcamp",
        access: "cohort",
        priceCents: null,
        billing: "application",
        statusLabel: "Waitlist Open",
        hubspotUrl: "https://www.jstdrmn.com/bootcamp",
        panel: "studio",
        sort: 4,
        placement: "grid",
        special: false,
      },
      {
        id: "crs_mash",
        slug: "mashup-bootcamp",
        title: "Mashup Bootcamp",
        tagline: "Produce professional mashups in Ableton Live.",
        description: "Ready to take your DJ career to the next level? Learn to produce professional mashups in Ableton Live.",
        kind: "bootcamp",
        access: "cohort",
        priceCents: null,
        billing: "application",
        statusLabel: "Applications Open",
        hubspotUrl: "https://www.jstdrmn.com/bootcamp",
        panel: "stripes",
        sort: 5,
        placement: "grid",
        special: false,
      },
      {
        id: "crs_one",
        slug: "one-on-one",
        title: "Private Sessions",
        tagline: "1-on-1 mentorship.",
        description: "Requests land on the Academy lead view. Nothing is booked and nothing is charged yet.",
        kind: "session",
        access: "request",
        priceCents: null,
        billing: "request",
        statusLabel: "Open",
        panel: "purple",
        sort: 6,
        placement: "off",
        special: false,
      },
    ],
  });

  await prisma.track.createMany({
    data: [
      { id: "trk_welcome", courseId: "crs_headliner", parentId: null, slug: "welcome", title: "Welcome to JSTDRMN Academy", blurb: "How the academy works and where to start.", position: 1 },
      { id: "trk_intro", courseId: "crs_headliner", parentId: "trk_welcome", slug: "introduction-to-edm", title: "Introduction to EDM", blurb: "The sounds, rooms, and roles this academy is built around.", position: 1 },
      { id: "trk_tree", courseId: "crs_headliner", parentId: "trk_intro", slug: "progression-tree", title: "The Progression Tree", blurb: "How you grow here, and the path we recommend through the tiers.", position: 1 },
      { id: "trk_brand", courseId: "crs_headliner", parentId: "trk_tree", slug: "branding", title: "Branding", blurb: "The name, look, and story people recognize before the first track.", position: 1 },
      { id: "trk_dj", courseId: "crs_headliner", parentId: "trk_tree", slug: "djing", title: "DJing", blurb: "Booth craft for playing the room.", position: 2 },
      { id: "trk_prod", courseId: "crs_headliner", parentId: "trk_tree", slug: "producing", title: "Producing", blurb: "Writing tracks, split into beginner and advanced.", position: 3 },
      { id: "trk_begin", courseId: "crs_headliner", parentId: "trk_prod", slug: "beginner-production", title: "Beginner Production", blurb: "A first sketch: arrangement and drums.", position: 1 },
      { id: "trk_adv", courseId: "crs_headliner", parentId: "trk_prod", slug: "advanced-production", title: "Advanced Production", blurb: "Sound design and arrangements that hold up in a club.", position: 2 },
      { id: "trk_mash", courseId: "crs_headliner", parentId: "trk_tree", slug: "mashups-remixes", title: "Mashups & Remixes", blurb: "Reworking records without losing what made people move.", position: 4 },
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
    trackId: string | null,
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
    trackId,
    position,
    title,
    summary,
    durationMin,
    runtimeLabel,
    videoProvider: "mock",
    videoUrl: `mock://${id}`,
    slidesTitle: extra.slidesTitle ?? null,
    slidesMeta: extra.slidesMeta ?? null,
    headliner: extra.headliner ?? false,
    drip: extra.drip ?? false,
  });

  await prisma.lesson.createMany({
    data: [
      lesson("les_welcome", "crs_headliner", null, "trk_welcome", 1, "Welcome to JSTDRMN Academy", "How the academy works and where to start.", 8, "08:00", { headliner: true, slidesTitle: "Slides: Welcome to JSTDRMN Academy", slidesMeta: "PDF · lesson handout" }),
      lesson("les_intro", "crs_headliner", null, "trk_intro", 2, "Introduction to EDM", "The sounds, rooms, and roles this academy is built around.", 12, "12:00", { headliner: true }),
      lesson("les_tree", "crs_headliner", null, "trk_tree", 3, "The Progression Tree", "How you grow here, and the path we recommend through the tiers.", 10, "10:00", { headliner: true }),
      lesson("les_brand", "crs_headliner", null, "trk_brand", 4, "Branding", "The name, look, and story people recognize before the first track.", 14, "14:00", { headliner: true }),
      lesson("les_djing", "crs_headliner", null, "trk_dj", 5, "DJing", "Booth craft for playing the room.", 16, "16:00", { headliner: true }),
      lesson("les_producing", "crs_headliner", null, "trk_prod", 6, "Producing", "Writing tracks, split into beginner and advanced.", 11, "11:00", { headliner: true }),
      lesson("les_begin", "crs_headliner", null, "trk_begin", 7, "Beginner Production", "A first sketch: arrangement and drums.", 18, "18:00", { headliner: true }),
      lesson("les_advanced", "crs_headliner", null, "trk_adv", 8, "Advanced Production", "Sound design and arrangements that hold up in a club.", 20, "20:00", { headliner: true }),
      lesson("les_mashups", "crs_headliner", null, "trk_mash", 9, "Mashups & Remixes", "Reworking records without losing what made people move.", 15, "15:00", { headliner: true }),
      lesson("les_signal", "crs_mixing", null, null, 1, "The Signal Chain", "Deck, mixer, booth, PA. Name every knob you can touch before the doors open.", 16, "16:12", { slidesTitle: "Slides: The Signal Chain", slidesMeta: "PDF · 14 slides · 2.1 MB" }),
      lesson("les_eqmix", "crs_mixing", null, null, 2, "EQ That Doesn't Kill the Kick", "Swap bass, don't stack it. The incoming kick earns the low end over four bars.", 19, "19:04", { slidesTitle: "Slides: EQ That Doesn't Kill the Kick", slidesMeta: "PDF · lesson handout" }),
      lesson("les_phrase", "crs_mixing", null, null, 3, "Phrase Mixing", "Count 8, 16, 32. If you can't sing the phrase, you aren't ready to blend it.", 17, "17:30", { slidesTitle: "Slides: Phrase Mixing", slidesMeta: "PDF · lesson handout" }),
      lesson("les_open", "crs_mixing", null, null, 4, "Building a 45-Minute Open", "Start where the room is, not where you want it. Save the anthem for someone else's peak.", 21, "21:15", { slidesTitle: "Slides: Building a 45-Minute Open", slidesMeta: "PDF · lesson handout" }),
      lesson("les_close", "crs_mixing", null, null, 5, "Closing a Room", "Bring the energy down without emptying the floor. Last track, lights up, no encore surprise.", 12, "12:48", { slidesTitle: "Slides: Closing a Room", slidesMeta: "PDF · lesson handout" }),
      lesson("les_decks", "crs_dj", "coh_dj6", null, 1, "Meet the Decks", "Power, needles or CDJs, and the mixer you will actually use this cohort.", 12, "12:00", { slidesTitle: "Slides: Meet the Decks", slidesMeta: "PDF · 18 slides · 2.8 MB" }),
      lesson("les_phrasing", "crs_dj", "coh_dj6", null, 2, "Phrasing & Song Structure", "Find the 1. Mark the chorus. Know when the kick comes back.", 15, "15:00", { slidesTitle: "Slides: Phrasing & Song Structure", slidesMeta: "PDF · lesson handout" }),
      lesson("les_beat", "crs_dj", "coh_dj6", null, 3, "Beatmatching", "Pitch fader for the big move. Platter for the last few percent.\nStay inside six percent or drop a fresh cue.\nMatch the kick before you touch the EQ.", 19, "18:42", { slidesTitle: "Slides: Beatmatching by Ear", slidesMeta: "PDF · 24 slides · 3.2 MB" }),
      lesson("les_eqtrans", "crs_dj", "coh_dj6", null, 4, "EQ & Transitions", "Bass swap, then mids if the vocals fight. Leave the highs alone until the phrase ends.", 21, "21:00", { slidesTitle: "Slides: EQ & Transitions", slidesMeta: "PDF · lesson handout" }),
      lesson("les_fx", "crs_dj", "coh_dj6", null, 5, "Effects & Loops", "A loop is a tool, not a personality. Filter sweeps once a night, not once a track.", 17, "17:00", { slidesTitle: "Slides: Effects & Loops", slidesMeta: "PDF · lesson handout" }),
      lesson("les_set", "crs_dj", "coh_dj6", null, 6, "Building Your First Set", "Sequence an opening hour from the tracks you already have. This one waits until the earlier lessons are done.", 25, "25:00", { drip: true, slidesTitle: "Slides: Building Your First Set", slidesMeta: "PDF · 20 slides · 2.6 MB" }),
      lesson("les_c5_setup", "crs_dj", "coh_dj5", null, 1, "Deck Setup in a Cold Room", "Cohort 5 archive. Warm the gear, check the booth polarity, then play.", 13, "13:20", { slidesTitle: "Slides: Deck Setup in a Cold Room", slidesMeta: "PDF · lesson handout" }),
      lesson("les_c5_cdj", "crs_dj", "coh_dj5", null, 2, "Beatmatching on CDJs", "Same ear, different platters. Jog sensitivity is not a moral failing.", 18, "18:10", { slidesTitle: "Slides: Beatmatching on CDJs", slidesMeta: "PDF · lesson handout" }),
      lesson("les_c5_loud", "crs_dj", "coh_dj5", null, 3, "EQ in a Loud Room", "If you can't hear the bass clash, trust the meters and a short headphone check.", 16, "16:44", { slidesTitle: "Slides: EQ in a Loud Room", slidesMeta: "PDF · lesson handout" }),
      lesson("les_c5_open", "crs_dj", "coh_dj5", null, 4, "Your First Opening Set", "Cohort 5's closing assignment. Keep it under an hour.", 11, "11:05", { slidesTitle: "Slides: Your First Opening Set", slidesMeta: "PDF · lesson handout" }),
    ],
  });

  await prisma.entitlement.createMany({
    data: [
      { userId: "usr_maya", product: "headliner", status: "active", source: "seed" },
      { userId: "usr_jordan", product: "program", courseId: "crs_mixing", status: "active", source: "seed" },
      { userId: "usr_jordan", product: "cohort", courseId: "crs_dj", cohortId: "coh_dj6", status: "active", source: "seed" },
    ],
  });

  await prisma.progress.createMany({
    data: [
      { userId: "usr_maya", lessonId: "les_welcome", status: "completed" },
      { userId: "usr_maya", lessonId: "les_intro", status: "in_progress" },
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
      lessonId: "les_intro",
      userId: "usr_maya",
      body: "Is the progression tree the order to watch these, or can I jump to DJing first?",
      createdAt: new Date("2026-10-07T21:10:00Z"),
    },
  });

  await prisma.mentor.createMany({
    data: [
      {
        id: "mnt_yu",
        slug: "yu-fu",
        name: "Yu Fu",
        roleLine: "Academy Lead, JSTDRMN",
        photoUrl: null,
        bio: "From concert band conducting and a cappella to live mixing, directing, and now EDM production. Yu focuses on hyper bass and leads the JSTDRMN Academy.",
        background: JSON.stringify([
          "Concert band conducting",
          "A cappella",
          "Live mixing",
          "Directing",
          "EDM production",
        ]),
        specialties: JSON.stringify(["EDM production", "Hyper bass"]),
        genres: JSON.stringify(["Hyper bass", "EDM production"]),
        active: true,
        placeholder: false,
        sort: 1,
      },
      {
        id: "mnt_soon_1",
        slug: "mentor-name",
        name: "Mentor name",
        roleLine: "Coming soon",
        photoUrl: null,
        bio: "Coming soon.",
        background: "[]",
        specialties: "[]",
        genres: "[]",
        active: true,
        placeholder: true,
        sort: 2,
      },
      {
        id: "mnt_soon_2",
        slug: "mentor-name-2",
        name: "Mentor name",
        roleLine: "Coming soon",
        photoUrl: null,
        bio: "Coming soon.",
        background: "[]",
        specialties: "[]",
        genres: "[]",
        active: true,
        placeholder: true,
        sort: 3,
      },
    ],
  });

  const syncStart = parseToronto("2026-10-20T16:00")!;
  const syncEnd = parseToronto("2026-10-20T17:00")!;
  const feedbackStart = parseToronto("2026-10-21T18:00")!;
  await prisma.eventType.createMany({
    data: [
      {
        id: "etype_connect",
        slug: "community-connect",
        name: "Community Connect",
        actionType: "link",
        actionUrl: "https://discord.com/channels/jstdrmn/community-connect",
        buttonLabel: "Join",
        sort: 1,
      },
      {
        id: "etype_green",
        slug: "green-room",
        name: "Green Room",
        actionType: "link",
        actionUrl: "https://zoom.us/j/jstdrmn-green-room",
        buttonLabel: "Join Zoom",
        sort: 2,
      },
      {
        id: "etype_sync",
        slug: "sync",
        name: "Sync",
        actionType: "calendar",
        actionUrl: googleCalendarUrl({ title: "Sync", description: "Bring one loop you want heard.", start: syncStart, end: syncEnd }),
        buttonLabel: "Add to calendar",
        sort: 3,
      },
      {
        id: "etype_feedback",
        slug: "production-feedback",
        name: "Production Feedback",
        actionType: "link",
        actionUrl: "https://discord.com/channels/jstdrmn/production-feedback",
        buttonLabel: "Join",
        sort: 4,
      },
    ],
  });
  await prisma.event.createMany({
    data: [
      {
        id: "evt_connect",
        slug: "community-connect",
        title: "Community Connect",
        description: "A weekly hang for the academy. Say what you’re working on.",
        typeId: "etype_connect",
        startsAt: parseToronto("2026-10-22T19:00")!,
        endsAt: parseToronto("2026-10-22T20:00")!,
        recurrence: "weekly",
        audience: "all",
      },
      {
        id: "evt_green",
        slug: "green-room",
        title: "Green Room",
        description: "Headliners on Zoom. One hour, cameras optional.",
        typeId: "etype_green",
        startsAt: parseToronto("2026-10-24T20:00")!,
        endsAt: parseToronto("2026-10-24T21:30")!,
        recurrence: "",
        audience: "headliners",
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
      },
      {
        id: "evt_feedback",
        slug: "production-feedback",
        title: "Production Feedback",
        description: "Weekly listen for producers. Change the day here and the Events page follows.",
        typeId: "etype_feedback",
        startsAt: feedbackStart,
        endsAt: parseToronto("2026-10-21T19:00")!,
        recurrence: "weekly",
        audience: "producers",
      },
    ],
  });
  await prisma.announcement.createMany({
    data: [
      {
        body: "Production Feedback starts in 30 minutes.",
        channelId: "100000000000000001",
        roleMention: "Producers",
        sendAt: new Date(feedbackStart.getTime() - 30 * 60 * 1000),
        eventId: "evt_feedback",
        leadMinutes: 30,
        status: "scheduled",
      },
      {
        body: "Community Connect is Thursday at 7pm Toronto.",
        channelId: "100000000000000002",
        sendAt: parseToronto("2026-10-23T15:00")!,
        status: "scheduled",
      },
    ],
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
