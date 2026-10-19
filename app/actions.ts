"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkPassword, createSession, destroySession, hashPassword, requireStaff, requireUser } from "@/lib/auth";
import { fulfillCheckout, grantEntitlement, revokeEntitlement } from "@/lib/billing";
import { resolveOffer } from "@/lib/catalog";
import { appUrl, stripeLive } from "@/lib/config";
import { prisma } from "@/lib/db";
import { asCourseAccess, containerAccess, isStaff, lessonAccess, earlierLessonsComplete, normalizeProduct, type Product } from "@/lib/entitlements";
import { applyPendingGrants, syncContact } from "@/lib/hubspot";
import { entitlementRecords } from "@/lib/learn";
import { announcementWhen } from "@/lib/announcements";
import { audiences, parseToronto } from "@/lib/events";
import { mentorSlug, packMentorList, parseMentorList } from "@/lib/mentors";
import { stripeClient } from "@/lib/stripe";
import { safeNext } from "@/lib/utils";
import { defaultVideoProvider, videoProviders } from "@/lib/video";

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email(),
  password: z.string().min(8).max(72),
});

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""), "");
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!user || !(await checkPassword(password, user.passwordHash))) {
    redirect(`/login?error=1${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }
  await createSession(user.id);
  if (next) redirect(next);
  redirect(isStaff(user.role) ? "/teacher" : "/dashboard");
}

export async function signup(formData: FormData) {
  const next = safeNext(String(formData.get("next") ?? ""), "");
  const parsed = signupSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    redirect(`/signup?error=form${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    redirect(`/signup?error=email${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }
  const user = await prisma.user.create({
    data: {
      id: `usr_${randomBytes(6).toString("hex")}`,
      email: parsed.data.email,
      name: parsed.data.name.trim(),
      passwordHash: await hashPassword(parsed.data.password),
      role: "student",
    },
  });
  await applyPendingGrants(user);
  await syncContact({ email: user.email, name: user.name, extra: { academy_signed_up: "true" } });
  await createSession(user.id);
  if (next) redirect(next);
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

async function lessonGate(lessonId: string, userId: string, role: string) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { course: true } });
  if (!lesson) return null;
  const siblings = await prisma.lesson.findMany({
    where: { courseId: lesson.courseId, cohortId: lesson.cohortId },
    orderBy: { position: "asc" },
  });
  const progress = await prisma.progress.findMany({
    where: { userId, lessonId: { in: siblings.map((item) => item.id) } },
  });
  const done = new Set(progress.filter((item) => item.status === "completed").map((item) => item.lessonId));
  const access = lessonAccess({
    role,
    lesson: {
      id: lesson.id,
      courseId: lesson.courseId,
      cohortId: lesson.cohortId,
      headliner: lesson.headliner,
      drip: lesson.drip,
      courseAccess: asCourseAccess(lesson.course.access),
    },
    entitlements: await entitlementRecords(userId),
    earlierComplete: earlierLessonsComplete(
      siblings.map((item) => ({ id: item.id, position: item.position, completed: done.has(item.id) })),
      lesson.id,
    ),
  });
  return { lesson, access };
}

export async function completeLesson(formData: FormData) {
  const user = await requireUser();
  const lessonId = String(formData.get("lessonId") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""), "/dashboard");
  const gate = await lessonGate(lessonId, user.id, user.role);
  if (!gate || !gate.access.allowed) redirect(next);
  await prisma.progress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    update: { status: "completed" },
    create: { userId: user.id, lessonId, status: "completed" },
  });
  revalidatePath(next);
  redirect(next);
}

export async function postComment(formData: FormData) {
  const user = await requireUser();
  const lessonId = String(formData.get("lessonId") ?? "");
  const parentId = String(formData.get("parentId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const next = safeNext(String(formData.get("next") ?? ""), "/dashboard");
  if (body.length < 2 || body.length > 2000) redirect(`${next}#comments`);
  const gate = await lessonGate(lessonId, user.id, user.role);
  if (!gate || (!gate.access.allowed && !isStaff(user.role))) redirect(next);
  if (parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parentId } });
    if (!parent || parent.lessonId !== lessonId) redirect(next);
  }
  await prisma.comment.create({
    data: { lessonId, userId: user.id, body, parentId: parentId || null },
  });
  revalidatePath("/teacher");
  redirect(`${next}#comments`);
}

export async function addLesson(formData: FormData) {
  await requireStaff();
  const courseId = String(formData.get("courseId") ?? "");
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) redirect("/teacher");
  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const durationMin = Number(formData.get("durationMin") ?? 0);
  const provider = String(formData.get("videoProvider") ?? "") || defaultVideoProvider;
  const videoUrl = String(formData.get("videoUrl") ?? "").trim();
  const slidesTitle = String(formData.get("slidesTitle") ?? "").trim();
  const slidesMeta = String(formData.get("slidesMeta") ?? "").trim();
  const cohortIdRaw = String(formData.get("cohortId") ?? "");
  const trackIdRaw = String(formData.get("trackId") ?? "");
  const providers = new Set<string>(videoProviders.map((item) => item.id));
  if (!title || !videoUrl || !providers.has(provider) || !Number.isFinite(durationMin) || durationMin < 1 || durationMin > 300) {
    redirect(`/teacher/courses/${course.slug}?error=lesson`);
  }
  const cohortId = cohortIdRaw || null;
  if (course.access === "cohort" && !cohortId) redirect(`/teacher/courses/${course.slug}?error=cohort`);
  if (cohortId) {
    const cohort = await prisma.cohort.findFirst({ where: { id: cohortId, courseId: course.id } });
    if (!cohort) redirect(`/teacher/courses/${course.slug}?error=cohort`);
  }
  const trackId = trackIdRaw || null;
  if (trackId) {
    const track = await prisma.track.findFirst({ where: { id: trackId, courseId: course.id } });
    if (!track) redirect(`/teacher/courses/${course.slug}?error=lesson`);
  }
  const last = await prisma.lesson.findFirst({
    where: { courseId: course.id, cohortId },
    orderBy: { position: "desc" },
  });
  await prisma.lesson.create({
    data: {
      id: `les_${randomBytes(4).toString("hex")}`,
      courseId: course.id,
      cohortId,
      trackId,
      position: (last?.position ?? 0) + 1,
      title,
      summary: summary || title,
      durationMin: Math.round(durationMin),
      runtimeLabel: `${Math.round(durationMin)}:00`,
      videoProvider: provider,
      videoUrl,
      slidesTitle: slidesTitle || null,
      slidesMeta: slidesMeta || (slidesTitle ? "PDF · lesson handout" : null),
      headliner: formData.get("headliner") === "on",
      drip: formData.get("drip") === "on",
    },
  });
  revalidatePath(`/teacher/courses/${course.slug}`);
  redirect(`/teacher/courses/${course.slug}?added=1`);
}

export async function addCohort(formData: FormData) {
  await requireStaff();
  const courseId = String(formData.get("courseId") ?? "");
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.access !== "cohort") redirect("/teacher");
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const startsLabel = String(formData.get("startsLabel") ?? "").trim();
  if (!name || !slug) redirect(`/bootcamps/${course.slug}?error=cohort`);
  const taken = await prisma.cohort.findUnique({ where: { slug } });
  if (taken) redirect(`/bootcamps/${course.slug}?error=slug`);
  const last = await prisma.cohort.findFirst({ where: { courseId }, orderBy: { sort: "desc" } });
  await prisma.cohort.create({
    data: {
      id: `coh_${randomBytes(4).toString("hex")}`,
      courseId,
      slug,
      name,
      startsLabel: startsLabel || "Dates TBD",
      sort: (last?.sort ?? 0) + 1,
    },
  });
  revalidatePath(`/bootcamps/${course.slug}`);
  redirect(`/bootcamps/${course.slug}?added=1`);
}

function parseTarget(target: string): { product: Product; courseId: string | null; cohortId: string | null } | null {
  const [kind, id, extra] = target.split(":");
  if (kind === "headliner") return { product: "headliner", courseId: null, cohortId: null };
  const product = normalizeProduct(kind);
  if ((kind === "program" || kind === "course" || kind === "ash") && id && product === "program") {
    return { product: "program", courseId: id, cohortId: null };
  }
  if (kind === "cohort" && id && extra) return { product: "cohort", cohortId: id, courseId: extra };
  return null;
}

export async function grantAccess(formData: FormData) {
  await requireStaff();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const parsed = parseTarget(String(formData.get("target") ?? ""));
  if (!email.includes("@") || !parsed) redirect("/teacher/access?error=1");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await prisma.pendingGrant.create({
      data: { email, product: parsed.product, courseId: parsed.courseId, cohortId: parsed.cohortId, source: "admin" },
    });
    redirect("/teacher/access?pending=1");
  }
  await grantEntitlement({ userId: user.id, ...parsed, source: "admin" });
  redirect("/teacher/access?granted=1");
}

export async function revokeAccess(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (id) await revokeEntitlement(id);
  redirect("/teacher/access?revoked=1");
}

export async function startCheckout(formData: FormData) {
  const user = await requireUser();
  const product = String(formData.get("product") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const purchase = await resolveOffer(product, slug);
  if (!purchase) redirect("/");
  if (isStaff(user.role)) redirect(purchase.href);
  const records = await entitlementRecords(user.id);
  const decision = containerAccess({
    role: user.role,
    access: purchase.access,
    courseId: purchase.courseId,
    cohortId: null,
    entitlements: records,
  });
  if (decision.allowed) redirect(purchase.href);
  if (purchase.amountCents === null && stripeLive()) {
    redirect(`/checkout?product=${product}&slug=${slug}&error=price`);
  }
  const checkout = await prisma.checkout.create({
    data: {
      userId: user.id,
      product: purchase.product,
      courseId: purchase.courseId,
      amountCents: purchase.amountCents,
      currency: "cad",
      status: "pending",
      mode: stripeLive() ? "stripe" : "mock",
      label: purchase.label,
    },
  });
  if (!stripeLive()) redirect(`/checkout/mock/${checkout.id}`);
  const stripe = stripeClient();
  if (!stripe || purchase.amountCents === null) redirect(`/checkout/mock/${checkout.id}`);
  const session = await stripe.checkout.sessions.create({
    mode: purchase.cadence === "month" ? "subscription" : "payment",
    customer_email: user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "cad",
          unit_amount: purchase.amountCents,
          recurring: purchase.cadence === "month" ? { interval: "month" } : undefined,
          product_data: { name: purchase.label },
        },
      },
    ],
    success_url: `${appUrl}/checkout/return?checkout=${checkout.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/checkout?product=${product}&slug=${encodeURIComponent(slug)}&canceled=1`,
    metadata: {
      checkoutId: checkout.id,
      userId: user.id,
      product: purchase.product,
      courseId: purchase.courseId,
    },
  });
  if (!session.url) redirect(`/checkout/mock/${checkout.id}`);
  redirect(session.url);
}

export async function confirmMockPayment(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("checkoutId") ?? "");
  const checkout = await prisma.checkout.findUnique({ where: { id } });
  if (!checkout || checkout.userId !== user.id) redirect("/dashboard");
  if (checkout.mode === "stripe" && stripeLive()) redirect("/dashboard");
  await fulfillCheckout(checkout.id, `mock_${checkout.id}`);
  await syncContact({
    email: user.email,
    name: user.name,
    extra: { academy_last_purchase: checkout.product },
  });
  const course = checkout.courseId ? await prisma.course.findUnique({ where: { id: checkout.courseId } }) : null;
  if (!course) redirect("/dashboard");
  if (course.access === "headliner") redirect("/headliner?unlocked=1");
  const lessons = await prisma.lesson.count({ where: { courseId: course.id } });
  redirect(lessons > 0 ? `/courses/${course.slug}?unlocked=1` : `/programs/${course.slug}?unlocked=1`);
}

export async function requestSession(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const mentorId = String(formData.get("mentorId") ?? "");
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  const mentor = await prisma.mentor.findUnique({ where: { id: mentorId } });
  if (!course || course.billing !== "request" || !mentor || !mentor.active || mentor.placeholder) {
    redirect("/private-sessions?error=1");
  }
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const topic = String(formData.get("topic") ?? "").trim();
  const preferredTimes = String(formData.get("preferredTimes") ?? "").trim();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const back = `/private-sessions?mentor=${mentor.slug}`;
  if (name.length < 2 || name.length > 80 || !emailOk || topic.length < 2 || topic.length > 500 || preferredTimes.length < 2 || preferredTimes.length > 500) {
    redirect(`${back}&error=1`);
  }
  await prisma.sessionRequest.create({
    data: { courseId: course.id, mentorId: mentor.id, name, email, topic, preferredTimes },
  });
  revalidatePath("/teacher");
  redirect("/private-sessions?sent=1");
}

export async function saveMentor(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const requestedSlug = mentorSlug(String(formData.get("slug") ?? "") || name);
  const roleLine = String(formData.get("roleLine") ?? "").trim();
  const photoUrl = String(formData.get("photoUrl") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const background = parseMentorList(String(formData.get("background") ?? ""));
  const specialties = parseMentorList(String(formData.get("specialties") ?? ""));
  const genres = parseMentorList(String(formData.get("genres") ?? ""));
  const sort = Number(formData.get("sort") ?? 0);
  const active = formData.get("active") === "on";
  const placeholder = formData.get("placeholder") === "on";
  const photoOk = photoUrl === "" || /^https?:\/\//.test(photoUrl);
  if (name.length < 2 || name.length > 80 || roleLine.length < 2 || roleLine.length > 120 || bio.length < 2 || bio.length > 2000 || !photoOk || !Number.isFinite(sort)) {
    const current = id ? await prisma.mentor.findUnique({ where: { id } }) : null;
    redirect(current ? `/teacher/mentors/${current.slug}?error=1` : "/teacher/mentors/new?error=1");
  }
  let slug = requestedSlug;
  const taken = await prisma.mentor.findUnique({ where: { slug } });
  if (taken && taken.id !== id) slug = `${requestedSlug}-${Date.now().toString(36)}`.slice(0, 60);
  const data = {
    name,
    slug,
    roleLine,
    photoUrl: photoUrl || null,
    bio,
    background: packMentorList(background),
    specialties: packMentorList(specialties),
    genres: packMentorList(genres),
    active,
    placeholder,
    sort: Math.round(sort),
  };
  if (id) {
    await prisma.mentor.update({ where: { id }, data });
  } else {
    await prisma.mentor.create({ data: { id: `mnt_${randomBytes(6).toString("hex")}`, ...data } });
  }
  revalidatePath("/private-sessions");
  revalidatePath("/teacher");
  redirect("/teacher?saved=mentor");
}

export async function setMentorActive(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) redirect("/teacher");
  await prisma.mentor.update({ where: { id }, data: { active } });
  revalidatePath("/private-sessions");
  revalidatePath("/teacher");
  redirect("/teacher");
}

function cleanAction(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "inherit") return null;
  return trimmed;
}

export async function saveEvent(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const typeId = String(formData.get("typeId") ?? "");
  const startsAt = parseToronto(String(formData.get("startsAt") ?? ""));
  const endsAt = parseToronto(String(formData.get("endsAt") ?? ""));
  const recurrence = String(formData.get("recurrence") ?? "") === "weekly" ? "weekly" : "";
  const audience = String(formData.get("audience") ?? "all");
  const cohortId = String(formData.get("cohortId") ?? "") || null;
  const active = formData.get("active") === "on";
  const cancelled = formData.get("cancelled") === "on";
  const actionType = cleanAction(String(formData.get("actionType") ?? ""));
  const actionUrl = cleanAction(String(formData.get("actionUrl") ?? ""));
  const buttonLabel = cleanAction(String(formData.get("buttonLabel") ?? ""));
  const requestedSlug = mentorSlug(String(formData.get("slug") ?? "") || title);
  const current = id ? await prisma.event.findUnique({ where: { id } }) : null;
  const fail = current ? `/teacher/events/${current.slug}?error=1` : "/teacher/events/new?error=1";
  const type = await prisma.eventType.findUnique({ where: { id: typeId } });
  if (!type || title.length < 2 || description.length < 2 || !startsAt || !endsAt || endsAt <= startsAt || !audiences.includes(audience as (typeof audiences)[number])) {
    redirect(fail);
  }
  if (audience === "cohort" && !cohortId) redirect(fail);
  if (actionType && actionType !== "link" && actionType !== "calendar") redirect(fail);
  if (actionUrl && !/^https?:\/\//.test(actionUrl)) redirect(fail);
  let slug = requestedSlug;
  const taken = await prisma.event.findUnique({ where: { slug } });
  if (taken && taken.id !== id) slug = `${requestedSlug}-${Date.now().toString(36)}`.slice(0, 60);
  const data = {
    title,
    slug,
    description,
    typeId,
    startsAt,
    endsAt,
    recurrence,
    audience,
    cohortId: audience === "cohort" ? cohortId : null,
    active,
    cancelled,
    actionType,
    actionUrl,
    buttonLabel,
  };
  const saved = id
    ? await prisma.event.update({ where: { id }, data })
    : await prisma.event.create({ data: { id: `evt_${randomBytes(6).toString("hex")}`, ...data } });
  const queued = await prisma.announcement.findMany({
    where: { eventId: saved.id, status: "scheduled", leadMinutes: { not: null } },
  });
  for (const item of queued) {
    if (item.leadMinutes == null) continue;
    await prisma.announcement.update({
      where: { id: item.id },
      data: { sendAt: new Date(saved.startsAt.getTime() - item.leadMinutes * 60 * 1000) },
    });
  }
  revalidatePath("/events");
  revalidatePath("/teacher/events");
  revalidatePath("/teacher/announcements");
  redirect("/teacher/events?saved=1");
}

export async function saveEventType(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const actionType = String(formData.get("actionType") ?? "link") === "calendar" ? "calendar" : "link";
  const actionUrl = String(formData.get("actionUrl") ?? "").trim();
  const buttonLabel = String(formData.get("buttonLabel") ?? "").trim();
  if (name.length < 2 || buttonLabel.length < 2 || (actionUrl && !/^https?:\/\//.test(actionUrl))) {
    redirect("/teacher/events?error=type");
  }
  const slug = mentorSlug(name);
  const data = { name, slug, actionType, actionUrl, buttonLabel };
  if (id) {
    const taken = await prisma.eventType.findUnique({ where: { slug } });
    await prisma.eventType.update({
      where: { id },
      data: { name, actionType, actionUrl, buttonLabel, ...(taken && taken.id !== id ? {} : { slug }) },
    });
  } else {
    const taken = await prisma.eventType.findUnique({ where: { slug } });
    await prisma.eventType.create({
      data: {
        id: `etype_${randomBytes(4).toString("hex")}`,
        ...data,
        slug: taken ? `${slug}-${Date.now().toString(36)}`.slice(0, 60) : slug,
        sort: (await prisma.eventType.count()) + 1,
      },
    });
  }
  revalidatePath("/events");
  revalidatePath("/teacher/events");
  redirect("/teacher/events?saved=type");
}

export async function saveAnnouncement(formData: FormData) {
  await requireStaff();
  const body = String(formData.get("body") ?? "").trim();
  const channelId = String(formData.get("channelId") ?? "").trim();
  const roleMention = String(formData.get("roleMention") ?? "").trim();
  const eventId = String(formData.get("eventId") ?? "") || null;
  const leadRaw = String(formData.get("leadMinutes") ?? "").trim();
  const leadMinutes = leadRaw === "" ? null : Number(leadRaw);
  const explicit = parseToronto(String(formData.get("sendAt") ?? ""));
  if (body.length < 2 || body.length > 1800 || channelId.length < 2 || channelId.length > 40) {
    redirect("/teacher/announcements?error=1");
  }
  const event = eventId ? await prisma.event.findUnique({ where: { id: eventId } }) : null;
  if (eventId && !event) redirect("/teacher/announcements?error=1");
  const when = announcementWhen(event?.startsAt ?? null, leadMinutes != null && Number.isFinite(leadMinutes) ? leadMinutes : null, explicit);
  if (!when) redirect("/teacher/announcements?error=1");
  await prisma.announcement.create({
    data: {
      body,
      channelId,
      roleMention: roleMention || null,
      eventId,
      leadMinutes: event && leadMinutes != null && Number.isFinite(leadMinutes) ? Math.round(leadMinutes) : null,
      sendAt: when,
      status: "scheduled",
    },
  });
  revalidatePath("/teacher/announcements");
  redirect("/teacher/announcements?saved=1");
}
