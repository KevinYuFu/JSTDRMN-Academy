"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { personName } from "@/lib/dashboard-people";
import { isLeadActor } from "@/lib/promote";

/** Lead may rename a person. Role, email, password, and sessions are not accepted. */
export async function savePersonName(formData: FormData) {
  const actor = await requireUser();
  const userId = String(formData.get("userId") ?? "");
  if (!isLeadActor(actor.role)) redirect("/teacher?tab=people&nameError=forbidden");
  const decision = personName(String(formData.get("name") ?? ""));
  if (!decision.ok) redirect("/teacher?tab=people&nameError=invalid");
  const target = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true } }) : null;
  if (!target) redirect("/teacher?tab=people&nameError=missing");
  await prisma.user.update({
    where: { id: target.id },
    data: { name: decision.name },
  });
  revalidatePath("/teacher");
  redirect("/teacher?tab=people&saved=name");
}
