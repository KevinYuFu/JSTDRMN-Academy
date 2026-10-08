"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkPassword, createSession, destroySession, hashPassword, requireStaff, requireUser } from "@/lib/auth";
import { fulfillCheckout, grantEntitlement, revokeEntitlement } from "@/lib/billing";
import { appUrl, prices, stripeLive } from "@/lib/config";
import { prisma } from "@/lib/db";
import { containerAccess, isStaff, lessonAccess, earlierLessonsComplete, type Product } from "@/lib/entitlements";
import { applyPendingGrants, syncContact } from "@/lib/hubspot";
import { entitlementRecords } from "@/lib/learn";
import { stripeClient } from "@/lib/stripe";
import { safeNext } from "@/lib/utils";

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
      courseAccess:
        lesson.course.access === "headliner" ||
        lesson.course.access === "purchase" ||
        lesson.course.access === "ash_subscription" ||
        lesson.course.access === "cohort"
          ? lesson.course.access
          : "purchase",
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
  const provider = String(formData.get("videoProvider") ?? "mock");
  const videoUrl = String(formData.get("videoUrl") ?? "").trim();
  const slidesTitle = String(formData.get("slidesTitle") ?? "").trim();
  const slidesMeta = String(formData.get("slidesMeta") ?? "").trim();
  const cohortIdRaw = String(formData.get("cohortId") ?? "");
  const providers = new Set(["mock", "youtube", "vimeo", "file"]);
  if (!title || !videoUrl || !providers.has(provider) || !Number.isFinite(durationMin) || durationMin < 1 || durationMin > 300) {
    redirect(`/teacher/courses/${course.slug}?error=lesson`);
  }
  const cohortId = cohortIdRaw || null;
  if (course.access === "cohort" && !cohortId) redirect(`/teacher/courses/${course.slug}?error=cohort`);
  if (cohortId) {
    const cohort = await prisma.cohort.findFirst({ where: { id: cohortId, courseId: course.id } });
    if (!cohort) redirect(`/teacher/courses/${course.slug}?error=cohort`);
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
  if (kind === "course" && id) return { product: "course", courseId: id, cohortId: null };
  if (kind === "ash" && id) return { product: "ash", courseId: id, cohortId: null };
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

async function resolvePurchase(product: string, slug: string) {
  if (product === "headliner") {
    const course = await prisma.course.findUnique({ where: { slug: "tutorials" } });
    if (!course) return null;
    return {
      product: "headliner" as const,
      courseId: course.id,
      label: "Headliner",
      amountCents: prices.headlinerMonthlyCents,
      cadence: "month" as const,
      href: "/courses/tutorials",
    };
  }
  if (product !== "course" && product !== "ash") return null;
  const course = await prisma.course.findUnique({ where: { slug } });
  if (!course) return null;
  if (product === "course" && course.access !== "purchase") return null;
  if (product === "ash" && course.access !== "ash_subscription") return null;
  return {
    product: product === "ash" ? ("ash" as const) : ("course" as const),
    courseId: course.id,
    label: course.title,
    amountCents: product === "ash" ? prices.ashMonthlyCents : prices.courseCents,
    cadence: product === "ash" ? ("month" as const) : ("once" as const),
    href: `/courses/${course.slug}`,
  };
}

export async function startCheckout(formData: FormData) {
  const user = await requireUser();
  const product = String(formData.get("product") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const purchase = await resolvePurchase(product, slug);
  if (!purchase) redirect("/#pricing");
  if (isStaff(user.role)) redirect(purchase.href);
  const records = await entitlementRecords(user.id);
  const access =
    purchase.product === "headliner" ? "headliner" : purchase.product === "ash" ? "ash_subscription" : "purchase";
  const decision = containerAccess({
    role: user.role,
    access,
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
  redirect(course ? `/courses/${course.slug}?unlocked=1` : "/dashboard");
}
