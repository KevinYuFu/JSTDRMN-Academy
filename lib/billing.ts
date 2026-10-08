import type { Product } from "./entitlements";
import { prisma } from "./db";

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
      return prisma.entitlement.update({
        where: { id: existing.id },
        data: { externalId: input.externalId, source: input.source, endsAt: input.endsAt ?? existing.endsAt },
      });
    }
    return existing;
  }
  const revoked = await prisma.entitlement.findFirst({
    where: { userId: input.userId, product: input.product, courseId, cohortId, status: "revoked" },
    orderBy: { createdAt: "desc" },
  });
  if (revoked) {
    return prisma.entitlement.update({
      where: { id: revoked.id },
      data: {
        status: "active",
        revokedAt: null,
        source: input.source,
        externalId: input.externalId ?? revoked.externalId,
        endsAt: input.endsAt ?? null,
      },
    });
  }
  return prisma.entitlement.create({
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
}

export async function revokeEntitlement(id: string) {
  return prisma.entitlement.update({
    where: { id },
    data: { status: "revoked", revokedAt: new Date() },
  });
}

export async function revokeByExternalId(externalId: string) {
  return prisma.entitlement.updateMany({
    where: { externalId, status: "active" },
    data: { status: "revoked", revokedAt: new Date() },
  });
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
  if (checkout.product === "headliner" || checkout.product === "course" || checkout.product === "ash" || checkout.product === "cohort") {
    await grantEntitlement({
      userId: checkout.userId,
      product: checkout.product,
      courseId: checkout.courseId,
      cohortId: checkout.cohortId,
      source: checkout.mode === "stripe" ? "stripe" : "mock_checkout",
      externalId: externalId ?? checkout.id,
    });
  }
  return checkout;
}
