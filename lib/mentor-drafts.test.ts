import assert from "node:assert/strict";
import { accessSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { MENTOR_DRAFT_PUBLICATION, MENTOR_DRAFT_RATE_LABEL, MENTOR_DRAFTS } from "./mentor-drafts";

const root = path.resolve(import.meta.dirname, "..");

function draft(slug: string) {
  const found = MENTOR_DRAFTS.find((item) => item.slug === slug);
  assert.ok(found, slug);
  return found;
}

describe("mentor draft profiles", () => {
  it("keeps the reviewed order and public names", () => {
    assert.deepEqual(
      MENTOR_DRAFTS.map((item) => item.name),
      ["Yuzu", "ODIN", "DAWNER", "VYMVN"],
    );
    assert.deepEqual(
      MENTOR_DRAFTS.map((item) => item.slug),
      ["yuzu", "odin", "dawner", "vymvn"],
    );
    assert.equal(draft("yuzu").name, "Yuzu");
    assert.equal(draft("yuzu").portraitAlt, "Yuzu");
    const text = MENTOR_DRAFTS.map((item) => `${item.name}\n${item.bio}\n${item.portraitAlt}`).join("\n");
    assert.equal(text.includes("Yu Fu"), false);
  });

  it("uses one provisional rate for every card", () => {
    assert.equal(MENTOR_DRAFT_RATE_LABEL, "CAD $60 / 1h");
    assert.equal(MENTOR_DRAFT_RATE_LABEL.endsWith("1h"), true);
    assert.equal(new Set([MENTOR_DRAFT_RATE_LABEL]).size, 1);
  });

  it("keeps teaching topics and genres in separate lists", () => {
    const topics = ["Ableton", "DJing", "production", "mixing/mastering"];
    assert.deepEqual([...draft("yuzu").genres], ["bass music"]);
    assert.deepEqual([...draft("odin").genres], ["bass music"]);
    assert.deepEqual([...draft("dawner").genres], ["house", "bass music"]);
    assert.deepEqual([...draft("vymvn").genres], ["electronic", "dance music", "house", "bass music"]);
    for (const item of MENTOR_DRAFTS) {
      assert.deepEqual([...item.specialties], topics);
      assert.equal(new Set(item.genres).size, item.genres.length);
      assert.equal(new Set(item.specialties).size, item.specialties.length);
      for (const genre of item.genres) {
        assert.equal(item.specialties.includes(genre), false);
        assert.equal(/hip-?hop/i.test(genre), false);
      }
      for (const topic of item.specialties) {
        assert.equal(/hip-?hop/i.test(topic), false);
      }
    }
  });

  it("keeps the reviewed bios and Instagram links", () => {
    assert.equal(draft("yuzu").bio, "DJ, producer, and JSTDRMN Academy instructor.");
    assert.equal(
      draft("odin").bio,
      "Toronto-based producer releasing flips and remixes as odinsounds, including dubstep tracks.",
    );
    assert.equal(
      draft("dawner").bio,
      "Toronto-based producer from St. John’s, Newfoundland, with over a decade of production and recording experience across pop, hip-hop, house, and bass.",
    );
    assert.equal(
      draft("vymvn").bio,
      "Toronto-based electronic artist making lyric-driven dance music, with releases on HEXAGON, ZEROCOOL, 2-Dutch, and NCS.",
    );
    assert.equal(draft("yuzu").instagramUrl, "https://www.instagram.com/yuzubops_official/");
    assert.equal(draft("odin").instagramUrl, "https://www.instagram.com/odinsounds/");
    assert.equal(draft("dawner").instagramUrl, "https://www.instagram.com/dawner.ca/");
    assert.equal(draft("vymvn").instagramUrl, "https://www.instagram.com/vymvn/");
    assert.equal(draft("yuzu").instagramLabel, "instagram.com/yuzubops_official");
    assert.equal(draft("odin").instagramLabel, "instagram.com/odinsounds");
    assert.equal(draft("dawner").instagramLabel, "instagram.com/dawner.ca");
    assert.equal(draft("vymvn").instagramLabel, "instagram.com/vymvn");
  });

  it("serves local portraits and stays unpublished", () => {
    assert.deepEqual(MENTOR_DRAFT_PUBLICATION, {
      status: "draft",
      writesDatabase: false,
      bookable: false,
      portraitLiveReuse: "unconfirmed",
    });
    for (const item of MENTOR_DRAFTS) {
      assert.equal(item.portraitSrc.startsWith("/mentor-draft-portraits/"), true);
      assert.equal(item.portraitSrc.endsWith(".jpg"), true);
      assert.equal(item.portraitSrc.includes("http"), false);
      accessSync(path.join(root, "public", item.portraitSrc.slice(1)));
    }
    assert.equal(draft("yuzu").portraitSrc, "/mentor-draft-portraits/yuzu.jpg");
  });

  it("is not wired into the database seed or mentor writers", () => {
    const source = readFileSync(path.join(root, "lib/mentor-drafts.ts"), "utf8");
    assert.equal(source.includes("prisma"), false);
    assert.equal(source.includes("@/lib/db"), false);
    const seed = readFileSync(path.join(root, "prisma/seed.ts"), "utf8");
    assert.equal(seed.includes("mentor-drafts"), false);
    assert.equal(seed.includes("MENTOR_DRAFTS"), false);
    const privateSessions = readFileSync(path.join(root, "app/private-sessions/page.tsx"), "utf8");
    assert.equal(privateSessions.includes("mentor-drafts"), false);
  });

  it("keeps the review page read-only and the portraits compact", () => {
    const page = readFileSync(path.join(root, "app/mentor-drafts/page.tsx"), "utf8");
    const view = readFileSync(path.join(root, "components/mentor-draft-review.tsx"), "utf8");
    assert.equal(page.includes("prisma"), false);
    assert.equal(view.includes("prisma"), false);
    assert.equal(view.includes("requestSession"), false);
    assert.equal(view.includes("saveMentor"), false);
    assert.equal(view.includes("Yu Fu"), false);
    assert.equal(page.includes("MentorDraftReview"), true);
    assert.equal(view.includes("MENTOR_DRAFT_RATE_LABEL"), true);
    assert.equal(view.includes('rateNote="provisional"'), true);
    const face = readFileSync(path.join(root, "components/mentor-card-face.tsx"), "utf8");
    assert.equal(face.includes("Teaching topics"), true);
    assert.equal(face.includes("Genres"), true);
    assert.equal(view.includes("mentor.specialties"), true);
    assert.equal(view.includes("mentor.genres"), true);
    assert.equal(view.includes("MentorCardFace"), true);
    assert.equal(view.includes("teachingTopics"), false);
    assert.equal(face.includes("teachingTopics"), false);
    const schema = readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
    const mentorModel = schema.slice(schema.indexOf("model Mentor {"), schema.indexOf("model Track {"));
    assert.match(mentorModel, /specialties\s+String/);
    assert.match(mentorModel, /genres\s+String/);
    const css = readFileSync(path.join(root, "components/mentor-draft-review.module.css"), "utf8");
    assert.match(css, /width:\s*96px/);
    assert.match(css, /height:\s*96px/);
    assert.match(css, /max-width:\s*420px/);
    assert.match(css, /width:\s*88px/);
    assert.match(css, /height:\s*88px/);
    assert.match(css, /border:\s*1px solid #4c1d95/);
  });

  it("keeps bios, topics, and genres as read-only text", () => {
    const files = [
      "app/mentor-drafts/page.tsx",
      "components/mentor-draft-review.tsx",
      "components/mentor-card-face.tsx",
      "components/mentor-draft-review.module.css",
    ];
    for (const file of files) {
      const source = readFileSync(path.join(root, file), "utf8");
      assert.equal(/contenteditable/i.test(source), false, file);
      assert.equal(/<(input|textarea|select)\b/i.test(source), false, file);
      assert.equal(/suppressContentEditableWarning/.test(source), false, file);
      assert.equal(source.includes("Editable for review"), false, file);
    }
    const view = readFileSync(path.join(root, "components/mentor-draft-review.tsx"), "utf8");
    const face = readFileSync(path.join(root, "components/mentor-card-face.tsx"), "utf8");
    assert.match(view, /bio=\{mentor\.bio\}/);
    assert.match(face, /<p className=\{styles\.bio\}>\{bio\}<\/p>/);
    assert.equal(view.includes("MentorForm"), false);
    assert.equal(face.includes("MentorForm"), false);
  });

  it("shows the draft price, provisional note, and Instagram only when the row has them", () => {
    const roster = readFileSync(path.join(root, "components/mentor-roster.tsx"), "utf8");
    const face = readFileSync(path.join(root, "components/mentor-card-face.tsx"), "utf8");
    const page = readFileSync(path.join(root, "app/private-sessions/page.tsx"), "utf8");
    assert.equal(roster.includes("MentorCardFace"), true);
    assert.equal(roster.includes("mentor-draft-review.module.css"), true);
    assert.equal(roster.includes("requestSession"), true);
    assert.equal(roster.includes("Coming soon"), true);
    assert.equal(roster.includes("placeholder"), true);
    assert.equal(roster.includes("mentor-drafts"), false);
    assert.equal(roster.includes("MENTOR_DRAFT"), false);
    assert.equal(roster.includes("CAD $60"), false);
    assert.equal(roster.includes("instagram.com"), false);
    assert.match(roster, /rateLabel=\{mentor\.rateLabel\}/);
    assert.match(roster, /rateNote=\{mentor\.rateLabel\?\.trim\(\) \? "provisional" : null\}/);
    assert.match(roster, /instagramUrl=\{mentor\.instagramUrl\}/);
    assert.match(roster, /instagramLabel=\{mentor\.instagramLabel\}/);
    assert.match(page, /rateLabel: mentor\.rateLabel/);
    assert.match(page, /instagramUrl: mentor\.instagramUrl/);
    assert.match(page, /instagramLabel: mentor\.instagramLabel/);
    assert.equal(page.includes("DRAFT"), false);
    assert.match(face, /price \? <span className=\{styles\.price\}>\{price\}<\/span>/);
    assert.match(face, /note \? <span className=\{styles\.provisional\}>\{note\}<\/span>/);
    assert.match(face, /instagramHref && instagramText/);
    assert.match(face, /<strong>Instagram:<\/strong>/);
    const css = readFileSync(path.join(root, "components/mentor-draft-review.module.css"), "utf8");
    assert.match(css, /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*438px\),\s*438px\)\)/);
    assert.equal(css.includes("438px 438px"), false);
    assert.match(css, /max-width:\s*438px/);
  });
});
