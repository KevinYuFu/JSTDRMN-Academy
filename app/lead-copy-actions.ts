"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { commitEventCopy } from "@/lib/event-copy";
import { commitMentorCopy } from "@/lib/mentor-copy";
import { commitPageCopy, pageCopyKeys, type PageCopyKey } from "@/lib/page-copy";
import { commitSkillCopy } from "@/lib/skill-copy";
import { loadSkillTree, saveSkillTree } from "@/lib/skill-tree-store";

async function writePageCopy(page: PageCopyKey, value: string) {
  await prisma.meta.upsert({
    where: { key: pageCopyKeys[page] },
    create: { key: pageCopyKeys[page], value },
    update: { value },
  });
}

function idsFrom(input: unknown, key: "mentors" | "events") {
  const list = (input as { mentors?: { id?: string }[]; events?: { id?: string }[] } | null)?.[key];
  if (!Array.isArray(list)) return [];
  return list.map((item) => item?.id).filter((id): id is string => typeof id === "string" && id.length > 0);
}

export async function saveSessionsCopy(input: { copy?: unknown; mentors?: unknown }) {
  const user = await getUser();
  const role = user?.role ?? null;
  const copy = commitPageCopy({ role, page: "sessions", input: input?.copy });
  if (!copy.ok) return copy;
  const ids = idsFrom(input?.mentors, "mentors");
  const rows = ids.length
    ? await prisma.mentor.findMany({
        where: { id: { in: ids }, active: true },
        select: {
          id: true,
          name: true,
          roleLine: true,
          bio: true,
          specialties: true,
          genres: true,
          rateLabel: true,
          instagramLabel: true,
        },
      })
    : [];
  const mentors = commitMentorCopy({ role, input: input?.mentors, rows });
  if (!mentors.ok) return mentors;
  await writePageCopy("sessions", copy.value);
  if (mentors.writes.length > 0) {
    await prisma.$transaction(mentors.writes.map((write) => prisma.mentor.update({ where: { id: write.id }, data: write.data })));
  }
  revalidatePath("/private-sessions");
  return { ok: true as const };
}

export async function saveEventsCopy(input: { copy?: unknown; events?: unknown }) {
  const user = await getUser();
  const role = user?.role ?? null;
  const copy = commitPageCopy({ role, page: "events", input: input?.copy });
  if (!copy.ok) return copy;
  const ids = idsFrom(input?.events, "events");
  const rows = ids.length
    ? await prisma.event.findMany({
        where: { id: { in: ids }, active: true, cancelled: false },
        select: { id: true, title: true, description: true },
      })
    : [];
  const events = commitEventCopy({ role, input: input?.events, rows });
  if (!events.ok) return events;
  await writePageCopy("events", copy.value);
  if (events.writes.length > 0) {
    await prisma.$transaction(events.writes.map((write) => prisma.event.update({ where: { id: write.id }, data: write.data })));
  }
  revalidatePath("/events");
  return { ok: true as const };
}

export async function saveSkillCopy(patches: unknown) {
  const user = await getUser();
  const tree = await loadSkillTree();
  const result = commitSkillCopy({ role: user?.role ?? null, tree, patches });
  if (!result.ok) return result;
  await saveSkillTree(result.tree);
  revalidatePath("/skill-tree", "layout");
  return { ok: true as const };
}
