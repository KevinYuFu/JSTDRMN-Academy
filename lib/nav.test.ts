import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { academyNav } from "./nav";
import { skillTreeNav } from "./skill-tree";

const ordinary = ["Programs", skillTreeNav.label, "Private Sessions", "Events", "My Courses"];

describe("staff tab", () => {
  it("hides Staff from guests and students and keeps My Courses", () => {
    for (const role of [null, "student", "owner", ""]) {
      const items = academyNav(role);
      assert.deepEqual(
        items.map((item) => item.label),
        ordinary,
      );
      assert.equal(
        items.some((item) => item.href === "/teacher" || item.label === "Staff" || item.label === "Dashboard"),
        false,
      );
      assert.equal(items.at(-1)?.href, "/dashboard");
      assert.equal(items.at(-1)?.key, "courses");
      assert.equal(items.at(-1)?.variant, undefined);
    }
  });

  it("adds the same Staff tab last for every staff role", () => {
    for (const role of ["mentor", "instructor", "lead", "teacher", "admin"]) {
      const items = academyNav(role);
      assert.deepEqual(
        items.slice(0, 5).map((item) => item.label),
        ordinary,
      );
      const staff = items.at(-1);
      assert.ok(staff);
      assert.equal(staff.label, "Staff");
      assert.equal(staff.href, "/teacher");
      assert.equal(staff.key, "teacher");
      assert.equal(staff.variant, "staff");
      assert.equal(items.filter((item) => item.variant === "staff").length, 1);
      assert.equal(items.find((item) => item.key === "courses")?.label, "My Courses");
    }
  });
});
