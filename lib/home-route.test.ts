import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { activeNavKey } from "./active-nav";
import { academyNav } from "./nav";

describe("home and programs routes", () => {
  const home = readFileSync("app/(academy)/(main)/page.tsx", "utf8");
  const programs = readFileSync("app/(academy)/(main)/programs/page.tsx", "utf8");
  const header = readFileSync("components/app-header.tsx", "utf8");
  const session = readFileSync("components/header-session.tsx", "utf8");
  const frame = readFileSync("components/header-frame.tsx", "utf8");
  const nav = readFileSync("components/header-nav.tsx", "utf8");
  const layout = readFileSync("app/(academy)/(main)/layout.tsx", "utf8");

  it("keeps the story on / and the catalog on /programs", () => {
    assert.match(home, /WelcomeHero/);
    assert.match(home, /localReviewEntryDecision/);
    assert.equal(home.includes("program-card"), false);
    assert.equal(home.includes("programGroups"), false);
    assert.equal(home.includes("headliner-banner"), false);
    assert.equal(home.includes('active="programs"'), false);
    assert.equal(home.includes("AppHeader"), false);
    assert.match(programs, /programGroups/);
    assert.match(programs, /Learn More/);
    assert.match(programs, /headliner-banner/);
    assert.equal(programs.includes("AppHeader"), false);
    assert.match(layout, /<AppHeader \/>/);
    assert.equal(layout.includes("getUser"), false);
    assert.equal(layout.includes("async"), false);
    assert.equal(layout.includes("cookies"), false);
    assert.equal(header.includes("getUser"), false);
    assert.equal(header.includes("async"), false);
    assert.equal(header.includes("cookies"), false);
    assert.match(header, /<Suspense fallback=\{<HeaderSessionFallback \/>\}>/);
    assert.equal(frame.includes("getUser"), false);
    assert.equal(frame.includes("async"), false);
    assert.equal(frame.includes("cookies"), false);
    assert.match(session, /await getUser\(\)/);
    assert.match(session, /aria-hidden="true"/);
    const fallback = session.slice(session.indexOf("function HeaderSessionFallback"), session.indexOf("export async function HeaderSession"));
    assert.equal(fallback.includes("Log in"), false);
    assert.equal(fallback.includes("Sign up"), false);
    assert.equal(fallback.includes("UserMenu"), false);
    assert.equal(fallback.includes("Dashboard"), false);
    assert.match(nav, /usePathname/);
    assert.match(nav, /activeNavKey/);
    assert.equal(activeNavKey("/"), null);
    assert.equal(activeNavKey("/programs"), "programs");
    assert.equal(activeNavKey("/programs/dj-bootcamp"), "programs");
    assert.equal(programs.includes("WelcomeHero"), false);
    assert.match(programs, /ProgramEditor/);
    assert.equal(home.includes("ProgramEditor"), false);
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
