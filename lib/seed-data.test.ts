import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { MENTOR_DRAFT_RATE_LABEL, MENTOR_DRAFTS } from "./mentor-drafts";
import {
  catalogCourses,
  djBootcamp,
  djCohorts,
  djLessons,
  fb2b,
  introCourses,
  introPass,
  productionBootcamp,
  sampleEvents,
  sampleEventTypes,
  seedAdmin,
} from "../prisma/seed-data";

describe("postgres seed catalog", () => {
  it("matches the DJ Bootcamp mock modules", () => {
    assert.equal(djBootcamp.slug, "dj-bootcamp");
    assert.equal(djBootcamp.kind, "bootcamp");
    assert.equal(djBootcamp.access, "cohort");
    assert.equal(djBootcamp.delivery, "live");
    assert.equal(djBootcamp.setting, "in_person");
    assert.equal(djBootcamp.billing, "monthly");
    assert.equal(djBootcamp.priceCents, null);
    assert.deepEqual(
      djCohorts.map((cohort) => cohort.slug),
      ["cohort-5", "cohort-6"],
    );
    assert.deepEqual(
      djLessons.filter((lesson) => lesson.cohortId === "coh_dj6").map((lesson) => lesson.title),
      [
        "Meet the Decks",
        "Phrasing & Song Structure",
        "Beatmatching",
        "EQ & Transitions",
        "Effects & Loops",
        "Building Your First Set",
      ],
    );
    assert.deepEqual(
      djLessons.filter((lesson) => lesson.cohortId === "coh_dj5").map((lesson) => lesson.title),
      ["Deck Setup in a Cold Room", "Beatmatching on CDJs", "EQ in a Loud Room", "Your First Opening Set"],
    );
    assert.deepEqual(
      djLessons.filter((lesson) => lesson.drip).map((lesson) => lesson.id),
      ["les_set"],
    );
    assert.ok(djLessons.every((lesson) => lesson.videoProvider === "mock" && lesson.videoUrl === `mock://${lesson.id}`));
    assert.deepEqual(
      [...new Set(djLessons.map((lesson) => lesson.courseId))],
      [djBootcamp.id],
    );
  });

  it("adds the intro subscription and the live classes without inventing prices or lessons", () => {
    assert.equal(introPass.priceCents, 2000);
    assert.equal(introPass.billing, "monthly");
    assert.equal(introPass.placement, "plan");
    assert.equal(introPass.access, "subscription");
    assert.deepEqual(
      introCourses.map((course) => course.title),
      [
        "Intro to EDM",
        "Intro to Ableton",
        "Intro to Sound Design",
        "Intro to Songwriting and Arrangement",
        "Intro to Mixing and Mastering",
        "Intro to AV",
        "Live Setup",
      ],
    );
    assert.deepEqual(
      introCourses.filter((course) => course.access === "open").map((course) => course.slug),
      ["intro-to-edm", "intro-to-ableton"],
    );
    assert.ok(
      introCourses.every(
        (course) =>
          course.delivery === "on_demand" &&
          course.planCourseId === introPass.id &&
          course.priceCents == null &&
          course.description === "Placeholder. No description yet.",
      ),
    );
    assert.equal(productionBootcamp.slug, "production-bootcamp");
    assert.equal(productionBootcamp.delivery, "live");
    assert.equal(productionBootcamp.setting, "in_person");
    assert.equal(productionBootcamp.priceCents, null);
    assert.equal(productionBootcamp.billing, "monthly");
    assert.match(productionBootcamp.description, /Lynx Music/);
    assert.equal(fb2b.id, "crs_fb2b");
    assert.equal(fb2b.presenter, "Ash F");
    assert.equal(fb2b.tagline, "From Bedroom to Banger");
    assert.equal(fb2b.delivery, "live");
    assert.equal(fb2b.setting, "");
    assert.equal(fb2b.priceCents, 50000);
    assert.equal(fb2b.billing, "once");
    assert.deepEqual(
      catalogCourses.map((course) => course.id),
      [introPass.id, ...introCourses.map((course) => course.id), djBootcamp.id, productionBootcamp.id, fb2b.id],
    );
  });

  it("includes the sample events and Yu, with no password in source", () => {
    assert.equal(seedAdmin.email, "yu@jstdrmn.com");
    assert.equal(seedAdmin.role, "lead");
    assert.equal("password" in seedAdmin, false);
    assert.deepEqual(
      sampleEventTypes.map((type) => type.slug),
      ["community-connect", "green-room", "sync", "production-feedback"],
    );
    assert.deepEqual(
      sampleEvents.map((event) => event.slug),
      ["community-connect", "green-room", "sync", "production-feedback"],
    );
    assert.match(sampleEventTypes.find((type) => type.slug === "sync")?.actionUrl ?? "", /^https:\/\/calendar\.google\.com\//);

    const source = [readFileSync("prisma/seed.ts", "utf8"), readFileSync("prisma/seed-data.ts", "utf8")].join("\n");
    assert.equal(source.includes("boothlights"), false);
    assert.equal(source.includes("cohort6"), false);
    assert.match(source, /SEED_ADMIN_PASSWORD/);
    assert.equal(source.includes("per month vs one-time is not confirmed"), false);
    assert.equal(/course\.upsert|lesson\.upsert|cohort\.upsert|event\.upsert|eventType\.upsert/.test(source), false);
    assert.equal(/\.delete\(/.test(source), false);
    assert.match(source, /findUnique/);
  });
});

describe("postgres migrations on deploy", () => {
  it("switches the schema to Postgres and migrates from the build, without seeding", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    assert.match(schema, /provider\s+=\s+"postgresql"/);
    assert.match(schema, /url\s+=\s+env\("DATABASE_URL"\)/);
    assert.match(schema, /directUrl\s+=\s+env\("DATABASE_URL_UNPOOLED"\)/);
    assert.equal(schema.includes("sqlite"), false);

    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
      prisma: { seed: string };
    };
    assert.equal(pkg.scripts.build, "prisma generate && prisma migrate deploy && next build");
    assert.equal(pkg.prisma.seed, "tsx prisma/seed.ts");
    for (const name of ["build", "dev", "setup"]) {
      assert.equal(pkg.scripts[name].includes("seed"), false);
    }

    const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as { buildCommand?: string };
    assert.equal(vercel.buildCommand, "npm run build");

    const migrationRoot = "prisma/migrations";
    const folders = readdirSync(migrationRoot).filter((name) => statSync(join(migrationRoot, name)).isDirectory());
    assert.deepEqual(folders.sort(), [
      "20261021205041_init",
      "20261105200000_google_login",
      "20261105220000_map_staff_roles_to_lead",
      "20261106120000_skill_tree",
      "20261106233000_course_delivery",
      "20261107003000_fb2b_once_price",
      "20261107120000_insert_reviewed_mentors",
      "20261107140000_mentor_rate_and_instagram",
      "20261107180000_insert_catalog_courses",
    ]);
    const sql = readFileSync(join(migrationRoot, "20261021205041_init", "migration.sql"), "utf8");
    assert.match(sql, /CREATE TABLE "Course"/);
    assert.match(sql, /CREATE TABLE "User"/);
    const googleSql = readFileSync(join(migrationRoot, "20261105200000_google_login", "migration.sql"), "utf8");
    assert.match(googleSql, /"googleSub"/);
    assert.match(googleSql, /DROP NOT NULL/);
    assert.equal(/drop table/i.test(googleSql), false);
    assert.equal(/delete from/i.test(googleSql), false);
    const roleSql = readFileSync(join(migrationRoot, "20261105220000_map_staff_roles_to_lead", "migration.sql"), "utf8");
    assert.match(roleSql, /UPDATE "User"/);
    assert.match(roleSql, /'lead'/);
    assert.match(roleSql, /'teacher'/);
    assert.match(roleSql, /'admin'/);
    assert.equal(/drop table/i.test(roleSql), false);
    assert.equal(/delete from/i.test(roleSql), false);
    const skillSql = readFileSync(join(migrationRoot, "20261106120000_skill_tree", "migration.sql"), "utf8");
    assert.match(skillSql, /CREATE TABLE "SkillTree"/);
    assert.match(skillSql, /JSONB/);
    assert.equal(/drop table/i.test(skillSql), false);
    assert.equal(/delete from/i.test(skillSql), false);
    const deliverySql = readFileSync(join(migrationRoot, "20261106233000_course_delivery", "migration.sql"), "utf8");
    assert.match(deliverySql, /"delivery"/);
    assert.match(deliverySql, /"setting"/);
    assert.match(deliverySql, /"planCourseId"/);
    assert.match(deliverySql, /'on_demand'/);
    assert.match(deliverySql, /'live'/);
    assert.match(deliverySql, /'in_person'/);
    assert.equal(/drop table/i.test(deliverySql), false);
    assert.equal(/delete from/i.test(deliverySql), false);
    const fb2bSql = readFileSync(join(migrationRoot, "20261107003000_fb2b_once_price", "migration.sql"), "utf8");
    assert.match(fb2bSql, /"priceCents" = 50000/);
    assert.match(fb2bSql, /'once'/);
    assert.match(fb2bSql, /crs_fb2b/);
    assert.equal(/drop table/i.test(fb2bSql), false);
    assert.equal(/delete from/i.test(fb2bSql), false);
    const mentorSql = readFileSync(join(migrationRoot, "20261107120000_insert_reviewed_mentors", "migration.sql"), "utf8");
    assert.match(mentorSql, /INSERT INTO "Mentor"/);
    assert.match(mentorSql, /WHERE NOT EXISTS/);
    for (const id of ["mnt_yuzu", "mnt_odin", "mnt_dawner", "mnt_vymvn"]) {
      assert.match(mentorSql, new RegExp(id));
    }
    assert.equal(/update\s+"/i.test(mentorSql), false);
    assert.equal(/delete\s+from/i.test(mentorSql), false);
    assert.equal(/drop table/i.test(mentorSql), false);
    const rateSql = readFileSync(join(migrationRoot, "20261107140000_mentor_rate_and_instagram", "migration.sql"), "utf8");
    assert.match(rateSql, /ADD COLUMN "rateLabel" TEXT/);
    assert.match(rateSql, /ADD COLUMN "instagramUrl" TEXT/);
    assert.match(rateSql, /ADD COLUMN "instagramLabel" TEXT/);
    assert.equal(/not null/i.test(rateSql), false);
    assert.equal(/delete\s+from/i.test(rateSql), false);
    assert.equal(/drop table/i.test(rateSql), false);
    for (const mentor of MENTOR_DRAFTS) {
      const id = `mnt_${mentor.slug}`;
      assert.match(rateSql, new RegExp(`SET "rateLabel" = '${MENTOR_DRAFT_RATE_LABEL.replace("$", "\\$")}' WHERE "id" = '${id}' AND "rateLabel" IS NULL`));
      assert.match(rateSql, new RegExp(`SET "instagramUrl" = '${mentor.instagramUrl}' WHERE "id" = '${id}' AND "instagramUrl" IS NULL`));
      assert.match(rateSql, new RegExp(`SET "instagramLabel" = '${mentor.instagramLabel}' WHERE "id" = '${id}' AND "instagramLabel" IS NULL`));
    }
    assert.match(readFileSync(join(migrationRoot, "migration_lock.toml"), "utf8"), /postgresql/);

    const catalogSql = readFileSync(join(migrationRoot, "20261107180000_insert_catalog_courses", "migration.sql"), "utf8");
    const catalogBlocks = catalogSql.split('INSERT INTO "Course"').slice(1);
    assert.equal(catalogBlocks.length, catalogCourses.length);
    assert.equal(/update\s+"/i.test(catalogSql), false);
    assert.equal(/delete\s+from/i.test(catalogSql), false);
    assert.equal(/drop\s+table/i.test(catalogSql), false);
    assert.equal(/insert into "(lesson|cohort|event|user)"/i.test(catalogSql), false);
    for (const course of catalogCourses) {
      const block = catalogBlocks.find((item) => item.includes(`'${course.id}'`));
      assert.ok(block, course.id);
      assert.match(block, new RegExp(`WHERE "id" = '${course.id}'\\s+OR "slug" = '${course.slug}'`));
      for (const value of [course.slug, course.title, course.tagline, course.description, course.kind, course.access, course.billing, course.panel, course.placement, course.delivery]) {
        assert.equal(block.includes(`'${value}'`), true, `${course.id} missing ${value}`);
      }
      assert.equal(block.includes(`'${course.statusLabel}'`), true, `${course.id} status`);
      assert.equal(block.includes(`'${course.setting}'`), true, `${course.id} setting`);
      assert.match(block, new RegExp(`\\n\\s+${course.sort},\\n`));
      assert.match(block, course.special ? /\n\s+true,/ : /\n\s+false,/);
      assert.match(block, course.priceCents == null ? /\n\s+NULL,/ : new RegExp(`\\n\\s+${course.priceCents},`));
      assert.equal(block.includes(course.hubspotUrl == null ? "NULL" : `'${course.hubspotUrl}'`), true);
      assert.equal(block.includes(course.presenter == null ? "NULL" : `'${course.presenter}'`), true);
      assert.equal(block.includes(course.planCourseId == null ? "NULL" : `'${course.planCourseId}'`), true);
    }
  });
});
