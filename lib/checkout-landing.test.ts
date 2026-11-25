import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { before, beforeEach, describe, it } from "node:test";

type Row = Record<string, unknown>;
type Where = Record<string, unknown> | undefined;

type PayGlobals = typeof globalThis & {
  __payPrisma?: unknown;
  __payUser?: { id: string; email: string; name: string; role: string };
  __payStripe?: {
    checkout: { sessions: { retrieve: (id: string) => Promise<FakeSession> } };
  } | null;
};

type FakeSession = {
  id: string;
  status: string;
  payment_status: string;
  subscription: string | null;
  metadata?: { checkoutId?: string; userId?: string };
};

type LoadedModule = {
  filename: string;
  paths: string[];
  loaded: boolean;
  _compile: (source: string, filename: string) => void;
};

type ModuleApi = {
  _resolveFilename: (request: string, parent: { filename?: string } | undefined, isMain: boolean, options?: unknown) => string;
  _cache: Record<string, unknown>;
  _nodeModulePaths: (from: string) => string[];
  new (id: string): LoadedModule;
};

const require = createRequire(import.meta.url);
const Module = require("module") as ModuleApi;

const pay = globalThis as PayGlobals;
const fan = { id: "usr_fan", email: "fan@example.com", name: "Fan Example", role: "student" };
pay.__payUser = fan;

const fakeDir = path.join(process.cwd(), "node_modules/.cache/pay-fakes");
const fakeFile = {
  auth: path.join(fakeDir, "auth.cjs"),
  stripe: path.join(fakeDir, "stripe.cjs"),
  db: path.join(fakeDir, "db.cjs"),
};

function compileFake(filename: string, source: string) {
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod._compile(source, filename);
  mod.loaded = true;
  Module._cache[filename] = mod;
}

compileFake(fakeFile.auth, `
  async function requireUser() { return global.__payUser; }
  exports.requireUser = requireUser;
  exports.requireStaff = requireUser;
  exports.checkPassword = async () => false;
  exports.hashPassword = async (value) => value;
  exports.createSession = async () => {};
  exports.destroySession = async () => {};
`);
compileFake(fakeFile.stripe, `
  exports.stripeClient = function stripeClient() { return global.__payStripe ?? null; };
`);
compileFake(fakeFile.db, `
  Object.defineProperty(exports, "prisma", { enumerable: true, get: () => global.__payPrisma });
`);

function resolvesTo(request: string, parent: { filename?: string } | undefined, base: string) {
  if (request === `@/lib/${base}` || request === `@/lib/${base}.ts`) return true;
  if (!parent?.filename) return false;
  if (request !== `./${base}` && request !== `./${base}.ts` && request !== `../${base}`) return false;
  const abs = path.resolve(path.dirname(parent.filename), request);
  return abs === path.join(process.cwd(), "lib", base) || abs.endsWith(`${path.sep}lib${path.sep}${base}.ts`);
}

const previousResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (resolvesTo(request, parent, "auth")) return fakeFile.auth;
  if (resolvesTo(request, parent, "stripe")) return fakeFile.stripe;
  if (resolvesTo(request, parent, "db")) return fakeFile.db;
  return previousResolve.call(Module, request, parent, isMain, options);
};

function matches(row: Row, where: Where) {
  if (!where) return true;
  return Object.entries(where).every(([key, value]) => row[key] === value);
}

function table() {
  const rows: Row[] = [];
  return {
    rows,
    async findUnique(args: { where: Where }) {
      return rows.find((row) => matches(row, args.where)) ?? null;
    },
    async findFirst(args: { where?: Where }) {
      return rows.filter((row) => matches(row, args.where)).at(-1) ?? null;
    },
    async create(args: { data: Row }) {
      const row = { id: `row_${rows.length + 1}`, ...args.data };
      rows.push(row);
      return row;
    },
    async update(args: { where: { id: string }; data: Row }) {
      const row = rows.find((item) => item.id === args.where.id);
      if (!row) throw new Error(`missing row ${args.where.id}`);
      Object.assign(row, args.data);
      return row;
    },
    async count(args: { where?: Where }) {
      return rows.filter((row) => matches(row, args.where)).length;
    },
  };
}

const checkout = table();
const entitlement = table();
const user = table();
const course = table();
const lesson = table();
const hubspotLog = table();
pay.__payPrisma = { checkout, entitlement, user, course, lesson, hubspotLog };

let afterPaymentPath = "";
let confirmMockPayment: (formData: FormData) => Promise<unknown>;
let checkoutReturn: (props: { searchParams: Promise<{ checkout?: string; session_id?: string }> }) => Promise<unknown>;

before(async () => {
  ({ AFTER_PAYMENT_PATH: afterPaymentPath } = await import("./billing"));
  ({ confirmMockPayment } = await import("../app/actions"));
  ({ default: checkoutReturn } = await import("../app/(academy)/(main)/checkout/return/page"));
});

let session: FakeSession = { id: "cs_test", status: "open", payment_status: "unpaid", subscription: null };

function clear(rows: Row[]) {
  rows.length = 0;
}

beforeEach(() => {
  clear(checkout.rows);
  clear(entitlement.rows);
  clear(user.rows);
  clear(course.rows);
  clear(lesson.rows);
  clear(hubspotLog.rows);
  user.rows.push({ id: fan.id, email: fan.email, name: fan.name, discordId: null });
  pay.__payUser = fan;
  pay.__payStripe = {
    checkout: { sessions: { retrieve: async () => session } },
  };
  process.env.HUBSPOT_PRIVATE_APP_TOKEN = "test-token";
  delete process.env.HUBSPOT_LIVE;
  delete process.env.STRIPE_SECRET_KEY;
});

function seedCheckout(input: { id: string; product: string; courseId: string | null; mode?: string; userId?: string }) {
  checkout.rows.push({
    id: input.id,
    userId: input.userId ?? fan.id,
    product: input.product,
    courseId: input.courseId,
    cohortId: null,
    status: "pending",
    mode: input.mode ?? "mock",
    label: input.product,
    amountCents: 2000,
    currency: "cad",
  });
}

function seedCourse(input: { id: string; slug: string; access: string; lessons: number }) {
  course.rows.push({ id: input.id, slug: input.slug, access: input.access });
  for (let index = 0; index < input.lessons; index += 1) {
    lesson.rows.push({ id: `${input.id}_${index}`, courseId: input.id });
  }
}

function redirectTarget(error: unknown) {
  if (typeof error === "object" && error !== null && "digest" in error && typeof error.digest === "string") {
    if (error.digest.startsWith("NEXT_REDIRECT;")) return error.digest.split(";").slice(2, -2).join(";");
  }
  const message = error instanceof Error ? error.message : "";
  const match = /^NEXT_REDIRECT (.*)$/.exec(message);
  return match?.[1] ?? null;
}

async function landing(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    const target = redirectTarget(error);
    if (target) return target;
    throw error;
  }
  throw new Error("expected a redirect");
}

function form(id: string) {
  const data = new FormData();
  data.set("checkoutId", id);
  return data;
}

function seat(product: string) {
  const row = entitlement.rows.find((item) => item.userId === fan.id && item.product === product && item.status === "active");
  assert.ok(row, `missing ${product} seat`);
  return row;
}

function purchaseLogged(product: string) {
  const log = hubspotLog.rows.at(-1);
  assert.equal(log?.action, "upsert_contact");
  const payload = JSON.parse(String(log?.payload)) as { properties: { academy_last_purchase: string } };
  assert.equal(payload.properties.academy_last_purchase, product);
}

describe("paid checkout landing", () => {
  it("keeps the shared path on the homepage until a success page exists", () => {
    assert.equal(afterPaymentPath, "/");
  });

  it("sends every successful mock payment home and still grants the seat", async () => {
    const samples = [
      { id: "chk_head", product: "headliner", courseId: "crs_head", slug: "headliner", access: "headliner", lessons: 0 },
      { id: "chk_intro", product: "program", courseId: "crs_intro", slug: "intro-courses", access: "subscription", lessons: 0 },
      { id: "chk_open", product: "program", courseId: "crs_open", slug: "open-decks", access: "purchase", lessons: 0 },
      { id: "chk_lessons", product: "program", courseId: "crs_dj", slug: "dj-bootcamp", access: "purchase", lessons: 3 },
    ];
    for (const sample of samples) {
      clear(checkout.rows);
      clear(entitlement.rows);
      clear(course.rows);
      clear(lesson.rows);
      clear(hubspotLog.rows);
      seedCourse(sample);
      seedCheckout(sample);
      assert.equal(await landing(() => confirmMockPayment(form(sample.id))), "/");
      assert.equal(checkout.rows[0]?.status, "paid");
      assert.equal(seat(sample.product).externalId, `mock_${sample.id}`);
      assert.equal(seat(sample.product).source, "mock_checkout");
      purchaseLogged(sample.product);
    }
  });

  it("sends a fulfilled mock payment home when the checkout has no course", async () => {
    seedCheckout({ id: "chk_none", product: "program", courseId: null });
    assert.equal(await landing(() => confirmMockPayment(form("chk_none"))), "/");
    assert.equal(checkout.rows[0]?.status, "paid");
    assert.equal(seat("program").courseId, null);
    purchaseLogged("program");
  });

  it("keeps the mock checkout guards on the dashboard", async () => {
    assert.equal(await landing(() => confirmMockPayment(form("missing"))), "/dashboard");
    seedCheckout({ id: "chk_other", product: "program", courseId: "crs_dj", userId: "usr_other" });
    assert.equal(await landing(() => confirmMockPayment(form("chk_other"))), "/dashboard");
    seedCheckout({ id: "chk_live", product: "program", courseId: "crs_dj", mode: "stripe" });
    process.env.STRIPE_SECRET_KEY = "sk_test_fake";
    assert.equal(await landing(() => confirmMockPayment(form("chk_live"))), "/dashboard");
    assert.equal(entitlement.rows.length, 0);
    assert.equal(hubspotLog.rows.length, 0);
    assert.equal(checkout.rows.every((row) => row.status === "pending"), true);
  });

  it("sends a paid Stripe return home and still grants the seat", async () => {
    seedCourse({ id: "crs_dj", slug: "dj-bootcamp", access: "purchase", lessons: 3 });
    seedCheckout({ id: "chk_stripe", product: "program", courseId: "crs_dj", mode: "stripe" });
    session = {
      id: "cs_paid",
      status: "complete",
      payment_status: "paid",
      subscription: null,
      metadata: { checkoutId: "chk_stripe", userId: fan.id },
    };
    assert.equal(
      await landing(() => checkoutReturn({ searchParams: Promise.resolve({ checkout: "chk_stripe", session_id: "cs_paid" }) })),
      "/",
    );
    assert.equal(checkout.rows[0]?.status, "paid");
    assert.equal(seat("program").externalId, "cs_paid");
    assert.equal(seat("program").source, "stripe");
    purchaseLogged("program");
  });

  it("sends a paid Stripe return home when the checkout has no course", async () => {
    seedCheckout({ id: "chk_sub", product: "headliner", courseId: null, mode: "stripe" });
    session = {
      id: "cs_sub",
      status: "open",
      payment_status: "paid",
      subscription: "sub_9",
      metadata: { checkoutId: "chk_sub", userId: fan.id },
    };
    assert.equal(
      await landing(() => checkoutReturn({ searchParams: Promise.resolve({ checkout: "chk_sub", session_id: "cs_sub" }) })),
      "/",
    );
    assert.equal(seat("headliner").externalId, "sub_9");
    purchaseLogged("headliner");
  });

  it("keeps a Stripe return that did not finish on the dashboard", async () => {
    seedCheckout({ id: "chk_stripe", product: "program", courseId: "crs_dj", mode: "stripe" });
    const unfinished: Array<{ query: { checkout?: string; session_id?: string }; next: FakeSession | null }> = [
      { query: {}, next: session },
      { query: { checkout: "chk_stripe" }, next: session },
      { query: { session_id: "cs_paid" }, next: session },
      { query: { checkout: "chk_stripe", session_id: "cs_paid" }, next: null },
      {
        query: { checkout: "chk_stripe", session_id: "cs_paid" },
        next: { id: "cs_paid", status: "complete", payment_status: "paid", subscription: null, metadata: { checkoutId: "other", userId: fan.id } },
      },
      {
        query: { checkout: "chk_stripe", session_id: "cs_paid" },
        next: { id: "cs_paid", status: "complete", payment_status: "paid", subscription: null, metadata: { checkoutId: "chk_stripe", userId: "usr_other" } },
      },
      {
        query: { checkout: "chk_stripe", session_id: "cs_paid" },
        next: { id: "cs_paid", status: "open", payment_status: "unpaid", subscription: null, metadata: { checkoutId: "chk_stripe", userId: fan.id } },
      },
      {
        query: { checkout: "missing", session_id: "cs_paid" },
        next: { id: "cs_paid", status: "complete", payment_status: "paid", subscription: null, metadata: { checkoutId: "missing", userId: fan.id } },
      },
    ];
    for (const step of unfinished) {
      pay.__payStripe = step.next
        ? { checkout: { sessions: { retrieve: async () => step.next as FakeSession } } }
        : null;
      assert.equal(await landing(() => checkoutReturn({ searchParams: Promise.resolve(step.query) })), "/dashboard");
    }
    assert.equal(entitlement.rows.length, 0);
    assert.equal(hubspotLog.rows.length, 0);
    assert.equal(checkout.rows[0]?.status, "pending");
  });
});
