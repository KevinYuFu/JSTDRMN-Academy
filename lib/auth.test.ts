import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

/**
 * `import { cache } from "react"` in Next's server build dedupes for one request.
 * The default react entry used by tsx is a passthrough, so this loads the server build.
 */
const require = createRequire(import.meta.url);
const reactServer = require(
  path.join(path.dirname(require.resolve("react")), "cjs/react.react-server.development.js"),
) as {
  cache: <T>(fn: () => Promise<T>) => () => Promise<T>;
  __SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: {
    A: { getCacheForType: (resourceType: () => WeakMap<object, unknown>) => WeakMap<object, unknown> } | null;
  };
};

const internals = reactServer.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

async function withRequest<T>(run: () => Promise<T>) {
  const caches = new Map<() => WeakMap<object, unknown>, WeakMap<object, unknown>>();
  const previous = internals.A;
  internals.A = {
    getCacheForType(resourceType) {
      let entry = caches.get(resourceType);
      if (!entry) {
        entry = resourceType();
        caches.set(resourceType, entry);
      }
      return entry;
    },
  };
  try {
    return await run();
  } finally {
    internals.A = previous;
  }
}

describe("getUser request dedupe", () => {
  it("wraps the session lookup in React cache and keeps the same rules", () => {
    const source = readFileSync(new URL("./auth.ts", import.meta.url), "utf8");
    assert.match(source, /import \{ cache \} from "react"/);
    assert.match(source, /export const getUser = cache\(async function getUser\(\)/);
    assert.match(source, /const token = jar\.get\(SESSION_COOKIE\)\?\.value/);
    assert.match(source, /if \(!token\) return null/);
    assert.match(source, /findUnique\(\{ where: \{ token \}, include: \{ user: true \} \}\)/);
    assert.match(source, /if \(!session\) return null/);
    assert.match(source, /session\.expiresAt\.getTime\(\) < Date\.now\(\)/);
    assert.match(source, /prisma\.session\.delete\(\{ where: \{ id: session\.id \} \}\)/);
    assert.match(source, /return session\.user/);
    assert.match(source, /const user = await getUser\(\)/);
    assert.match(source, /if \(!user\) redirect\("\/login"\)/);
    assert.match(source, /redirect\("\/teacher\?skillTree=forbidden"\)/);
    assert.equal(source.includes("loading.tsx"), false);
  });

  it("runs one lookup when the header and the page ask in the same request", async () => {
    let lookups = 0;
    const getUser = reactServer.cache(async function getUser() {
      lookups += 1;
      await Promise.resolve();
      return { id: "user-1", role: "student" as const };
    });

    const first = await withRequest(async () => {
      const [headerUser, pageUser] = await Promise.all([getUser(), getUser()]);
      const again = await getUser();
      return { headerUser, pageUser, again };
    });
    assert.equal(lookups, 1);
    assert.equal(first.headerUser, first.pageUser);
    assert.equal(first.again.id, "user-1");
    assert.equal(first.again.role, "student");

    const second = await withRequest(() => getUser());
    assert.equal(lookups, 2);
    assert.deepEqual(second, { id: "user-1", role: "student" });

    await Promise.all([getUser(), getUser()]);
    assert.equal(lookups, 4);
  });
});
