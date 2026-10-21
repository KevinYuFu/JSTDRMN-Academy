import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { djBootcamp, djCohorts, djLessons, sampleEventTypes, sampleEvents, seedAdmin } from "./seed-data";

const prisma = new PrismaClient();

function adminEmail() {
  return (process.env.SEED_ADMIN_EMAIL || seedAdmin.email).trim().toLowerCase();
}

function adminPassword() {
  const raw = process.env.SEED_ADMIN_PASSWORD;
  if (raw == null) return null;
  const password = raw.trim();
  if (!password) return null;
  if (password.length < 8) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters.");
  }
  return password;
}

function withoutId<T extends { id: string }>(row: T) {
  const { id, ...data } = row;
  void id;
  return data;
}

async function main() {
  const email = adminEmail();
  const password = adminPassword();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing && !password) {
    throw new Error(
      "Set SEED_ADMIN_PASSWORD (at least 8 characters) before the first seed. The password is not stored in the repo.",
    );
  }

  const passwordHash = password ? await hash(password, 10) : null;

  await prisma.$transaction(async (db) => {
    await db.course.upsert({
      where: { id: djBootcamp.id },
      create: djBootcamp,
      update: withoutId(djBootcamp),
    });

    for (const cohort of djCohorts) {
      await db.cohort.upsert({
        where: { id: cohort.id },
        create: cohort,
        update: withoutId(cohort),
      });
    }

    for (const lesson of djLessons) {
      await db.lesson.upsert({
        where: { id: lesson.id },
        create: lesson,
        update: withoutId(lesson),
      });
    }

    for (const eventType of sampleEventTypes) {
      await db.eventType.upsert({
        where: { id: eventType.id },
        create: eventType,
        update: withoutId(eventType),
      });
    }

    for (const event of sampleEvents) {
      await db.event.upsert({
        where: { id: event.id },
        create: event,
        update: withoutId(event),
      });
    }

    if (existing) {
      await db.user.update({
        where: { email },
        data: {
          name: seedAdmin.name,
          role: seedAdmin.role,
          ...(passwordHash ? { passwordHash } : {}),
        },
      });
    } else if (passwordHash) {
      await db.user.create({
        data: {
          id: seedAdmin.id,
          email,
          name: seedAdmin.name,
          role: seedAdmin.role,
          passwordHash,
        },
      });
    } else {
      throw new Error("Set SEED_ADMIN_PASSWORD before the first seed.");
    }
  });

  console.log("Seeded DJ Bootcamp, sample events, and Yu.");
  if (passwordHash) console.log("Yu's password was set from SEED_ADMIN_PASSWORD.");
  else console.log("Yu already existed. Password was left unchanged.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
