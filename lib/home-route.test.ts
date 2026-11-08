import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { academyNav } from "./nav";

describe("home and programs routes", () => {
  const home = readFileSync("app/page.tsx", "utf8");
  const programs = readFileSync("app/programs/page.tsx", "utf8");
  const header = readFileSync("components/app-header.tsx", "utf8");

  it("keeps the story on / and the catalog on /programs", () => {
    assert.match(home, /WelcomeHero/);
    assert.match(home, /localReviewEntryDecision/);
    assert.equal(home.includes("program-card"), false);
    assert.equal(home.includes("programGroups"), false);
    assert.equal(home.includes("headliner-banner"), false);
    assert.equal(home.includes('active="programs"'), false);
    assert.match(programs, /programGroups/);
    assert.match(programs, /Learn More/);
    assert.match(programs, /headliner-banner/);
    assert.match(programs, /active="programs"/);
    assert.equal(programs.includes("WelcomeHero"), false);
    assert.equal(programs.includes("ProgramEditor"), false);
  });

  it("sends the logo home and the Programs tab to the catalog", () => {
    assert.match(header, /href="\/"/);
    assert.equal(header.includes("homeForRole"), false);
    for (const role of [null, "student", "lead", "mentor", "instructor"]) {
      const programsLink = academyNav(role).find((item) => item.key === "programs");
      assert.equal(programsLink?.href, "/programs");
      assert.equal(programsLink?.label, "Programs");
    }
    const staff = academyNav("lead");
    const dashboard = staff.find((item) => item.key === "teacher");
    assert.equal(dashboard?.href, "/teacher");
    assert.equal(dashboard?.variant, "staff");
    assert.ok(staff.findIndex((item) => item.key === "courses") < staff.findIndex((item) => item.key === "teacher"));
  });
});
