import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { commitEventCopy } from "./event-copy";
import { commitMentorCopy } from "./mentor-copy";
import { commitPageCopy, pageCopyDefaults, readPageCopy } from "./page-copy";
import { commitSkillCopy } from "./skill-copy";
import type { SkillNode } from "./skill-tree";

const mentor = {
  id: "men_a",
  name: "Ava",
  roleLine: "Mentor",
  bio: "Beats.",
  specialties: JSON.stringify(["Drums"]),
  genres: JSON.stringify(["House"]),
  rateLabel: "$80",
  instagramLabel: "ava",
};

describe("page copy", () => {
  it("uses the current sentences until a Lead saves new ones", () => {
    assert.deepEqual(readPageCopy("sessions", null), pageCopyDefaults.sessions);
    assert.equal(commitPageCopy({ role: "student", page: "sessions", input: { title: "X", lede: "Y" } }).ok, false);
    const saved = commitPageCopy({ role: "lead", page: "events", input: { title: "Nights", lede: "Academy only." } });
    assert.equal(saved.ok, true);
    if (saved.ok) assert.deepEqual(readPageCopy("events", saved.value), { title: "Nights", lede: "Academy only." });
    assert.equal(commitPageCopy({ role: "lead", page: "events", input: { title: "", lede: "Y" } }).ok, false);
  });
});

describe("mentor and event copy", () => {
  it("lets a Lead edit visible mentor text and leaves other roles unchanged", () => {
    const denied = commitMentorCopy({
      role: "mentor",
      input: { mentors: [{ ...mentor, name: "Nope" }] },
      rows: [mentor],
    });
    assert.equal(denied.ok, false);
    const saved = commitMentorCopy({
      role: "lead",
      input: { mentors: [{ id: "men_a", name: "Ava B", roleLine: "Mentor", bio: "Songs.", specialties: "Drums", genres: "House", rateLabel: "$80", instagramLabel: "ava" }] },
      rows: [mentor],
    });
    assert.equal(saved.ok, true);
    if (saved.ok) {
      assert.equal(saved.writes[0]?.data.name, "Ava B");
      assert.equal(Object.hasOwn(saved.writes[0]?.data ?? {}, "instagramUrl"), false);
      assert.equal(Object.hasOwn(saved.writes[0]?.data ?? {}, "active"), false);
    }
    const blank = commitMentorCopy({
      role: "lead",
      input: { mentors: [{ id: "men_a", name: " ", roleLine: "", bio: "", specialties: "", genres: "", rateLabel: "", instagramLabel: "" }] },
      rows: [mentor],
    });
    assert.equal(blank.ok, false);
    if (!blank.ok) assert.equal(blank.fieldErrors["men_a.name"], "Add a name.");
  });

  it("edits event title and description only", () => {
    const row = { id: "evt_a", title: "Open decks", description: "Bring a track." };
    assert.equal(commitEventCopy({ role: "student", input: { events: [{ id: "evt_a", title: "X", description: "Y" }] }, rows: [row] }).ok, false);
    const blocked = commitEventCopy({
      role: "lead",
      input: { events: [{ id: "evt_a", title: "X", description: "Y", audience: "all" }] },
      rows: [row],
    });
    assert.equal(blocked.ok, false);
    const saved = commitEventCopy({
      role: "lead",
      input: { events: [{ id: "evt_a", title: "Open decks night", description: "Bring a track." }] },
      rows: [row],
    });
    assert.equal(saved.ok, true);
    if (saved.ok) assert.deepEqual(saved.writes[0]?.data, { title: "Open decks night", description: "Bring a track." });
  });
});

describe("skill tree copy", () => {
  const tree: SkillNode = {
    id: "root",
    slug: [],
    crumb: "Map",
    card: { title: "Academy" },
    hint: "Click a branch.",
    children: [
      {
        id: "dj",
        slug: ["dj"],
        crumb: "DJ",
        card: { title: "DJ", sub: "Decks" },
        children: [],
      },
    ],
  };

  it("changes a visible card title and refuses a student or a blank title", () => {
    assert.equal(commitSkillCopy({ role: "student", tree, patches: [{ path: "n:dj:card:title", value: "Decks" }] }).ok, false);
    const blank = commitSkillCopy({ role: "lead", tree, patches: [{ path: "n:root:card:title", value: " " }] });
    assert.equal(blank.ok, false);
    const saved = commitSkillCopy({ role: "lead", tree, patches: [{ path: "n:dj:card:title", value: "DJ Lab" }, { path: "n:root:hint", value: "Start here." }] });
    assert.equal(saved.ok, true);
    if (saved.ok) {
      assert.equal(saved.tree.children[0]?.card.title, "DJ Lab");
      assert.equal(saved.tree.hint, "Start here.");
      assert.equal(tree.children[0]?.card.title, "DJ");
    }
  });
});

describe("lead copy actions", () => {
  it("checks the signed-in user before every write", () => {
    const actions = readFileSync("app/lead-copy-actions.ts", "utf8");
    for (const name of ["saveSessionsCopy", "saveEventsCopy", "saveSkillCopy"]) {
      assert.match(actions, new RegExp(`export async function ${name}[\\s\\S]*getUser\\(`));
    }
    assert.match(actions, /commitPageCopy/);
    assert.match(actions, /commitMentorCopy/);
    assert.match(actions, /commitEventCopy/);
    assert.match(actions, /commitSkillCopy/);
  });
});

describe("edit control shape", () => {
  it("uses a lower rounded rectangle for Edit, Save, and Cancel", () => {
    const css = readFileSync("components/program-editor.module.css", "utf8");
    assert.match(css, /\.toolbar \.action \{[^}]*border-radius: 6px;/);
    assert.match(css, /\.toolbar \.action \{[^}]*padding: 12px 16px;/);
    assert.match(css, /\.page \{[^}]*margin: 20px 40px 0;/);
    const programs = readFileSync("components/program-editor.tsx", "utf8");
    assert.match(programs, /styles\.action/);
    assert.match(programs, /data-lead-editor/);
  });
});
