import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { activeNavKey } from "./active-nav";
import { academyNav } from "./nav";
import { skillTreeNav } from "./skill-tree";

const ordinary = ["Programs", skillTreeNav.label, "Private Sessions", "Events", "My Courses"];

describe("staff tab", () => {
  it("hides Dashboard from guests and students and keeps My Courses", () => {
    for (const role of [null, "student", "owner", ""]) {
      const items = academyNav(role);
      assert.deepEqual(
        items.map((item) => item.label),
        ordinary,
      );
      assert.equal(items.some((item) => item.href === "/teacher" || item.label === "Dashboard"), false);
      assert.equal(items.find((item) => item.key === "programs")?.href, "/programs");
      assert.equal(items.at(-1)?.href, "/dashboard");
      assert.equal(items.at(-1)?.key, "courses");
      assert.equal(items.at(-1)?.variant, undefined);
    }
  });

  it("puts the same Dashboard tab in the menu for every staff role", () => {
    for (const role of ["mentor", "instructor", "lead", "teacher", "admin"]) {
      const items = academyNav(role);
      const dashboard = items.find((item) => item.variant === "staff");
      const courses = items.find((item) => item.key === "courses");
      assert.ok(dashboard);
      assert.ok(courses);
      assert.equal(dashboard.label, "Dashboard");
      assert.equal(dashboard.href, "/teacher");
      assert.equal(dashboard.key, "teacher");
      assert.equal(items.filter((item) => item.variant === "staff").length, 1);
      assert.equal(courses.label, "My Courses");
      assert.equal(items.find((item) => item.key === "programs")?.href, "/programs");
      assert.equal(courses.href, "/dashboard");
      assert.ok(items.indexOf(courses) < items.indexOf(dashboard));
      assert.equal(items[items.indexOf(dashboard) - 1], courses);
      assert.equal(items.at(-1), dashboard);
    }
  });
});

describe("active nav highlight", () => {
  it("follows the highlight each page used to pass in", () => {
    assert.equal(activeNavKey("/"), null);
    assert.equal(activeNavKey("/login"), null);
    assert.equal(activeNavKey("/signup"), null);
    assert.equal(activeNavKey("/programs"), "programs");
    assert.equal(activeNavKey("/programs/dj-bootcamp"), "programs");
    assert.equal(activeNavKey(skillTreeNav.href), skillTreeNav.key);
    assert.equal(activeNavKey(`${skillTreeNav.href}/dj/mixing`), skillTreeNav.key);
    assert.equal(activeNavKey("/private-sessions"), "sessions");
    assert.equal(activeNavKey("/events"), "events");
    assert.equal(activeNavKey("/dashboard"), "courses");
    assert.equal(activeNavKey("/courses/intro"), "courses");
    assert.equal(activeNavKey("/bootcamps/dj/fall"), "courses");
    assert.equal(activeNavKey("/checkout"), "courses");
    assert.equal(activeNavKey("/checkout/mock/chk_1"), "courses");
    assert.equal(activeNavKey("/headliner"), "courses");
    assert.equal(activeNavKey("/teacher"), "teacher");
    assert.equal(activeNavKey("/teacher/events"), "teacher");
    assert.equal(activeNavKey("/teacher/events/new"), "teacher");
    assert.equal(activeNavKey("/mentor-drafts"), null);
  });
});
