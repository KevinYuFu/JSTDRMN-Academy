"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  persistProgramEdits,
  type ProgramEditStore,
  type ProgramEditSubmission,
} from "@/lib/program-edit";

const store: ProgramEditStore = {
  async findByIds(ids) {
    if (ids.length === 0) return [];
    return prisma.course.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        slug: true,
        title: true,
        tagline: true,
        description: true,
        statusLabel: true,
        presenter: true,
        priceCents: true,
        access: true,
        billing: true,
        placement: true,
      },
    });
  },
  async updateMany(patches) {
    await prisma.$transaction(
      patches.map((patch) =>
        prisma.course.update({
          where: { id: patch.id },
          data: patch.data,
        }),
      ),
    );
  },
};

export async function savePrograms(input: ProgramEditSubmission) {
  const user = await getUser();
  return persistProgramEdits({
    role: user?.role ?? null,
    input,
    store,
    revalidate: (path) => revalidatePath(path),
  });
}
