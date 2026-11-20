import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function loadEnv() {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

function functionBody(source: string, name: string) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, name);
  const next = source.indexOf("\nexport async function ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

describe("checkout reads the database", () => {
  it("shows a program price change on the next offer read", async () => {
    loadEnv();
    const { prisma } = await import("./db");
    const { resolveOffer } = await import("./catalog");
    const course = await prisma.course.findFirst({
      where: { access: "subscription", billing: "monthly", priceCents: { not: null } },
      orderBy: { sort: "asc" },
    });
    assert.ok(course?.priceCents != null);
    const original = course.priceCents;
    await prisma.course.update({ where: { id: course.id }, data: { priceCents: 4500 } });
    try {
      const offer = await resolveOffer("program", course.slug);
      assert.equal(offer?.amountCents, 4500);
    } finally {
      await prisma.course.update({ where: { id: course.id }, data: { priceCents: original } });
    }
  });

  it("does not count lessons or price a checkout from the shared cache", () => {
    const catalog = readFileSync("lib/catalog.ts", "utf8");
    const offer = functionBody(catalog, "resolveOffer");
    assert.match(offer, /prisma\.course\.find/);
    assert.equal(offer.includes("listCourses"), false);
    assert.equal(offer.includes("courseBySlug"), false);
    const payment = functionBody(readFileSync("app/actions.ts", "utf8"), "confirmMockPayment");
    assert.match(payment, /prisma\.lesson\.count/);
    assert.equal(payment.includes("lessonsForCourse"), false);
    const checkout = functionBody(readFileSync("app/actions.ts", "utf8"), "startCheckout");
    assert.match(checkout, /resolveOffer/);
    assert.equal(checkout.includes("listCourses"), false);
  });
});

describe("skill-tree writes read the row they will replace", () => {
  it("sees an out-of-band document change before a save", async () => {
    loadEnv();
    const { prisma } = await import("./db");
    const { loadSkillTreeForWrite } = await import("./content");
    const row = await prisma.skillTree.findUnique({ where: { id: "current" } });
    assert.ok(row);
    const original = row.document;
    const mutated = JSON.parse(JSON.stringify(original)) as { card: { title: string } };
    const title = `${mutated.card.title} out of band`;
    mutated.card.title = title;
    await prisma.skillTree.update({ where: { id: "current" }, data: { document: mutated } });
    try {
      const tree = await loadSkillTreeForWrite();
      assert.equal(tree.card.title, title);
    } finally {
      await prisma.skillTree.update({ where: { id: "current" }, data: { document: original as object } });
    }
  });

  it("uses the uncached read on every write path", () => {
    const files = ["app/skill-tree-actions.ts", "app/lead-copy-actions.ts"];
    const names = ["saveSkillNode", "addSkillChild", "removeSkillNode", "reorderSkillNode", "moveSkillNode", "saveSkillCopy"];
    for (const name of names) {
      const source = files.map((file) => readFileSync(file, "utf8")).find((text) => text.includes(`function ${name}`));
      assert.ok(source, name);
      const body = functionBody(source, name);
      assert.match(body, /loadSkillTreeForWrite\(\)/, name);
      assert.equal(body.includes("loadSkillTree()"), false, name);
    }
  });
});
