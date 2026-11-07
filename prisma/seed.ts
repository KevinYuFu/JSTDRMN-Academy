import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { isBuiltinLeadEmail, leadEmails, nameFromEmail } from "../lib/google";
import { ensureSkillTree, type SkillTreeStore } from "../lib/skill-tree-store";
import { catalogCourses, djCohorts, djLessons, sampleEventTypes, sampleEvents, seedAdmin } from "./seed-data";

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

async function main() {
  let skillTreeCreated = false;
  const email = adminEmail();
  const password = adminPassword();
  const existing = await prisma.user.findUnique({ where: { email } });
  const passwordHash = password ? await hash(password, 10) : null;
  const allowList = leadEmails().filter((item) => item !== email);

  await prisma.$transaction(async (db) => {
    // Insert by stable id only. A second run does not update or delete rows staff already edited.
    for (const course of catalogCourses) {
      const existing = await db.course.findUnique({ where: { id: course.id } });
      if (!existing) await db.course.create({ data: course });
    }

    for (const cohort of djCohorts) {
      const existing = await db.cohort.findUnique({ where: { id: cohort.id } });
      if (!existing) await db.cohort.create({ data: cohort });
    }

    for (const lesson of djLessons) {
      const existing = await db.lesson.findUnique({ where: { id: lesson.id } });
      if (!existing) await db.lesson.create({ data: lesson });
    }

    for (const eventType of sampleEventTypes) {
      const existing = await db.eventType.findUnique({ where: { id: eventType.id } });
      if (!existing) await db.eventType.create({ data: eventType });
    }

    for (const event of sampleEvents) {
      const existing = await db.event.findUnique({ where: { id: event.id } });
      if (!existing) await db.event.create({ data: event });
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
    } else {
      await db.user.create({
        data: {
          id: seedAdmin.id,
          email,
          name: seedAdmin.name,
          role: seedAdmin.role,
          passwordHash,
        },
      });
    }

    for (const leadEmail of allowList) {
      const row = await db.user.findUnique({ where: { email: leadEmail } });
      const forceLead = isBuiltinLeadEmail(leadEmail);
      if (!row) {
        await db.user.create({
          data: {
            id: `usr_${randomBytes(6).toString("hex")}`,
            email: leadEmail,
            name: nameFromEmail(leadEmail),
            role: "lead",
            passwordHash: null,
          },
        });
      } else if (forceLead || row.role === "student" || row.role === "teacher" || row.role === "admin") {
        if (row.role !== "lead") {
          await db.user.update({ where: { id: row.id }, data: { role: "lead" } });
        }
      }
    }

    const skill = await ensureSkillTree(db as unknown as SkillTreeStore);
    skillTreeCreated = skill.created;
  });

  console.log("Inserted any missing programs, sample events, and Yu. Existing rows were left as they are.");
  console.log(skillTreeCreated ? "Skill tree filled from the built-in map." : "Skill tree already saved. Left it alone.");
  if (passwordHash) console.log("Yu's password was set from SEED_ADMIN_PASSWORD.");
  else if (existing) console.log("Yu already existed. Password was left unchanged.");
  else console.log("Yu has no password. Sign in with Google, or set SEED_ADMIN_PASSWORD and seed again.");
  if (allowList.length) console.log(`Lead emails: ${allowList.join(", ")}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
