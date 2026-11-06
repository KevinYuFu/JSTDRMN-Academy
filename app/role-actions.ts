"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decidePromotion, STORED_LEAD_ROLES } from "@/lib/promote";

export async function setUserRole(formData: FormData) {
  const actor = await requireUser();
  const userId = String(formData.get("userId") ?? "");
  const nextRole = String(formData.get("role") ?? "");

  const outcome = await prisma.$transaction(async (db) => {
    const target = userId ? await db.user.findUnique({ where: { id: userId } }) : null;
    if (!target) return { ok: false as const, reason: "missing" as const };
    const leadCount = await db.user.count({
      where: { role: { in: [...STORED_LEAD_ROLES] } },
    });
    const decision = decidePromotion({
      actorRole: actor.role,
      actorId: actor.id,
      targetId: target.id,
      targetRole: target.role,
      nextRole,
      leadCount,
    });
    if (!decision.ok) return decision;
    await db.user.update({
      where: { id: target.id },
      data: { role: decision.role },
    });
    return decision;
  });

  revalidatePath("/teacher");
  if (!outcome.ok) redirect(`/teacher?roleError=${outcome.reason}`);
  redirect("/teacher?saved=role");
}
