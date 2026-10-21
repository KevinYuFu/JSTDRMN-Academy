import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { djBootcamp, djCohorts, djLessons, sampleEvents, sampleEventTypes, seedAdmin } from "../prisma/seed-data";

describe("postgres seed catalog", () => {
  it("matches the DJ Bootcamp mock modules", () => {
    assert.equal(djBootcamp.slug, "dj-bootcamp");
    assert.equal(djBootcamp.kind, "bootcamp");
    assert.equal(djBootcamp.access, "cohort");
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
  });

  it("includes the sample events and Yu, with no password in source", () => {
    assert.equal(seedAdmin.email, "yu@jstdrmn.com");
    assert.equal(seedAdmin.role, "teacher");
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
    assert.equal(folders.length, 1);
    const sql = readFileSync(join(migrationRoot, folders[0], "migration.sql"), "utf8");
    assert.match(sql, /CREATE TABLE "Course"/);
    assert.match(sql, /CREATE TABLE "User"/);
    assert.match(readFileSync(join(migrationRoot, "migration_lock.toml"), "utf8"), /postgresql/);
  });
});
