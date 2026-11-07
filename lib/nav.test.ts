import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
      assert.equal(courses.href, "/dashboard");
      assert.ok(items.indexOf(courses) < items.indexOf(dashboard));
      assert.equal(items[items.indexOf(dashboard) - 1], courses);
      assert.equal(items.at(-1), dashboard);
    }
  });
});
