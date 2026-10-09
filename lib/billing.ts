import type { Product } from "./entitlements";
import { syncHeadlinerRole } from "./discord";
import { prisma } from "./db";

async function syncHeadlinerDiscord(userId: string, active: boolean) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { discordId: true } });
    await syncHeadlinerRole({ discordUserId: user?.discordId ?? null, active });
  } catch {
    // A Discord outage must not block the entitlement.
  }
}

export async function grantEntitlement(input: {
  userId: string;
  product: Product;
  courseId?: string | null;
  cohortId?: string | null;
  source: string;
  externalId?: string | null;
  endsAt?: Date | null;
}) {
  const courseId = input.courseId ?? null;
  const cohortId = input.cohortId ?? null;
  const existing = await prisma.entitlement.findFirst({
    where: { userId: input.userId, product: input.product, courseId, cohortId, status: "active" },
  });
  if (existing) {
    if (input.externalId && existing.externalId !== input.externalId) {
      const updated = await prisma.entitlement.update({
        where: { id: existing.id },
        data: { externalId: input.externalId, source: input.source, endsAt: input.endsAt ?? existing.endsAt },
      });
      if (input.product === "headliner") await syncHeadlinerDiscord(input.userId, true);
      return updated;
    }
    if (input.product === "headliner") await syncHeadlinerDiscord(input.userId, true);
    return existing;
  }
  const revoked = await prisma.entitlement.findFirst({
    where: { userId: input.userId, product: input.product, courseId, cohortId, status: "revoked" },
    orderBy: { createdAt: "desc" },
  });
  const saved = revoked
    ? await prisma.entitlement.update({
        where: { id: revoked.id },
        data: {
          status: "active",
          revokedAt: null,
          source: input.source,
          externalId: input.externalId ?? revoked.externalId,
          endsAt: input.endsAt ?? null,
        },
      })
    : await prisma.entitlement.create({
        data: {
          userId: input.userId,
          product: input.product,
          courseId,
          cohortId,
          status: "active",
          source: input.source,
          externalId: input.externalId ?? null,
          endsAt: input.endsAt ?? null,
        },
      });
  if (input.product === "headliner") await syncHeadlinerDiscord(input.userId, true);
  return saved;
}

export async function revokeEntitlement(id: string) {
  const row = await prisma.entitlement.update({
    where: { id },
    data: { status: "revoked", revokedAt: new Date() },
  });
  if (row.product === "headliner") await syncHeadlinerDiscord(row.userId, false);
  return row;
}

export async function revokeByExternalId(externalId: string) {
  const rows = await prisma.entitlement.findMany({ where: { externalId, status: "active" } });
  const result = await prisma.entitlement.updateMany({
    where: { externalId, status: "active" },
    data: { status: "revoked", revokedAt: new Date() },
  });
  for (const row of rows) {
    if (row.product === "headliner") await syncHeadlinerDiscord(row.userId, false);
  }
  return result;
}

/** Shared by mock checkout and the Stripe webhook so both paths grant the same way. */
export async function fulfillCheckout(checkoutId: string, externalId?: string | null) {
  const checkout = await prisma.checkout.findUnique({ where: { id: checkoutId } });
  if (!checkout) return null;
  if (checkout.status !== "paid") {
    await prisma.checkout.update({
      where: { id: checkout.id },
      data: { status: "paid" },
    });
  }
  const product =
    checkout.product === "course" || checkout.product === "ash"
      ? "program"
      : checkout.product === "headliner" || checkout.product === "program" || checkout.product === "cohort"
        ? checkout.product
        : null;
  if (product) {
    await grantEntitlement({
      userId: checkout.userId,
      product,
      courseId: checkout.courseId,
      cohortId: checkout.cohortId,
      source: checkout.mode === "stripe" ? "stripe" : "mock_checkout",
      externalId: externalId ?? checkout.id,
    });
  }
  return checkout;
}
