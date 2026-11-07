import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canEditPrograms,
  commitProgramEdits,
  createProgramEditorState,
  detailEditItem,
  editorIsDirty,
  formatPriceInput,
  initialEditorMode,
  listingEditItems,
  parsePriceDollars,
  persistProgramEdits,
  priceEditMode,
  programEditCopy,
  reduceProgramEditor,
  type ProgramContentRow,
  type ProgramContentWrite,
  type ProgramEditStore,
} from "./program-edit";

function row(partial: Partial<ProgramContentRow> & Pick<ProgramContentRow, "id">): ProgramContentRow {
  return {
    slug: partial.slug ?? partial.id,
    title: partial.title ?? "DJ Bootcamp",
    tagline: partial.tagline ?? "Learn the decks.",
    description: partial.description ?? "A longer about section.",
    statusLabel: partial.statusLabel ?? "Waitlist Open",
    presenter: partial.presenter ?? null,
    priceCents: partial.priceCents ?? null,
    access: partial.access ?? "cohort",
    billing: partial.billing ?? "application",
    placement: partial.placement ?? "grid",
    ...partial,
  };
}

function memory(seed: ProgramContentRow[]) {
  const rows = seed.map((item) => ({ ...item }));
  const finds: string[][] = [];
  const updates: { id: string; data: ProgramContentWrite }[] = [];
  const store: ProgramEditStore = {
    async findByIds(ids) {
      finds.push([...ids]);
      return rows.filter((item) => ids.includes(item.id)).map((item) => ({ ...item }));
    },
    async updateMany(patches) {
      updates.push(...patches.map((patch) => ({ id: patch.id, data: { ...patch.data } })));
      for (const patch of patches) {
        const current = rows.find((item) => item.id === patch.id);
        if (current) Object.assign(current, patch.data);
      }
    },
  };
  return { rows, finds, updates, store };
}

function listingInput(programs: Record<string, unknown>[]) {
  return { scope: "listing", programs };
}

function text(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    title: "DJ Bootcamp",
    tagline: "Learn the decks.",
    statusLabel: "Waitlist Open",
    presenter: "",
    ...extra,
  };
}

describe("who can edit programs", () => {
  it("starts every role on the read-only page", () => {
    assert.equal(initialEditorMode(), "view");
    const state = createProgramEditorState(listingEditItems(null, [row({ id: "crs_dj" })]));
    assert.equal(state.mode, "view");
    assert.equal(editorIsDirty(state), false);
    assert.equal(reduceProgramEditor(state, { type: "change", id: "crs_dj", field: "title", value: "Nope" }).drafts[0]?.title, "DJ Bootcamp");
  });

  it("allows Lead, including the old teacher and admin words", () => {
    for (const role of ["lead", "teacher", "admin", " Teacher "]) {
      assert.equal(canEditPrograms(role), true, role);
    }
  });

  it("blocks Mentor, Instructor, Student, and guests", () => {
    for (const role of ["mentor", "instructor", "student", "owner", "", null, undefined]) {
      assert.equal(canEditPrograms(role), false, String(role));
    }
  });
});

describe("explicit edit transitions", () => {
  it("opens edit only from the Edit action, then Cancel restores the page", () => {
    const items = listingEditItems(null, [row({ id: "crs_dj", presenter: "Ash" })]);
    const view = createProgramEditorState(items);
    const ignored = reduceProgramEditor(view, { type: "saving" });
    assert.equal(ignored.mode, "view");
    const editing = reduceProgramEditor(view, { type: "edit" });
    assert.equal(editing.mode, "edit");
    const typed = reduceProgramEditor(editing, { type: "change", id: "crs_dj", field: "title", value: "Decks" });
    assert.equal(editorIsDirty(typed), true);
    assert.equal(typed.message, null);
    const cancelled = reduceProgramEditor(typed, { type: "cancel" });
    assert.equal(cancelled.mode, "view");
    assert.equal(cancelled.drafts[0]?.title, "DJ Bootcamp");
    assert.equal(editorIsDirty(cancelled), false);
  });

  it("keeps the draft on a save error and returns to the read-only page after success", () => {
    const items = detailEditItem(row({ id: "crs_dj", description: "About the decks." }));
    const editing = reduceProgramEditor(createProgramEditorState([items]), { type: "edit" });
    const typed = reduceProgramEditor(editing, { type: "change", id: "crs_dj", field: "description", value: "New about." });
    const saving = reduceProgramEditor(typed, { type: "saving" });
    assert.equal(saving.saving, true);
    assert.equal(reduceProgramEditor(saving, { type: "cancel" }), saving);
    const failed = reduceProgramEditor(saving, {
      type: "failed",
      message: programEditCopy.invalid,
      fieldErrors: { "crs_dj.title": programEditCopy.title },
    });
    assert.equal(failed.mode, "edit");
    assert.equal(failed.saving, false);
    assert.equal(failed.drafts[0]?.description, "New about.");
    assert.equal(failed.fieldErrors["crs_dj.title"], programEditCopy.title);
    const saved = reduceProgramEditor(typed, { type: "saved", items: typed.drafts });
    assert.equal(saved.mode, "view");
    assert.equal(saved.drafts[0]?.description, "New about.");
    assert.equal(editorIsDirty(saved), false);
  });

  it("does not replace an open draft when the read-only page refreshes", () => {
    const items = listingEditItems(null, [row({ id: "crs_dj" })]);
    const editing = reduceProgramEditor(createProgramEditorState(items), { type: "edit" });
    const typed = reduceProgramEditor(editing, { type: "change", id: "crs_dj", field: "tagline", value: "New line" });
    const synced = reduceProgramEditor(typed, { type: "sync", items });
    assert.equal(synced.drafts[0]?.tagline, "New line");
    const closed = reduceProgramEditor(synced, { type: "cancel" });
    const next = listingEditItems(null, [row({ id: "crs_dj", tagline: "From the server." })]);
    const refreshed = reduceProgramEditor(closed, { type: "sync", items: next });
    assert.equal(refreshed.mode, "view");
    assert.equal(refreshed.drafts[0]?.tagline, "From the server.");
  });
});

describe("field boundaries", () => {
  it("edits a stored price and leaves the Headliner and hidden prices alone", () => {
    assert.equal(priceEditMode({ placement: "banner", access: "headliner", billing: "monthly", priceCents: 2000 }), "external");
    assert.equal(priceEditMode({ placement: "grid", access: "headliner", billing: "monthly", priceCents: 2000 }), "external");
    assert.equal(priceEditMode({ placement: "grid", access: "cohort", billing: "application", priceCents: null }), "hidden");
    assert.equal(priceEditMode({ placement: "grid", access: "cohort", billing: "monthly", priceCents: null }), "hidden");
    assert.equal(priceEditMode({ placement: "grid", access: "subscription", billing: "monthly", priceCents: null }), "hidden");
    assert.equal(priceEditMode({ placement: "grid", access: "purchase", billing: "once", priceCents: 4000 }), "course");
    assert.deepEqual(parsePriceDollars("20.50"), { ok: true, cents: 2050 });
    assert.deepEqual(parsePriceDollars(" 0 "), { ok: true, cents: 0 });
    assert.deepEqual(parsePriceDollars(""), { ok: true, cents: null });
    assert.equal(parsePriceDollars("20.555").ok, false);
    assert.equal(parsePriceDollars("$20").ok, false);
    assert.equal(parsePriceDollars("10000.01").ok, false);
    assert.equal(formatPriceInput(2000), "20");
    assert.equal(formatPriceInput(2050), "20.50");
    const banner = row({ id: "crs_head", placement: "banner", access: "headliner", billing: "monthly", priceCents: 2000 });
    const hidden = row({ id: "crs_dj" });
    const priced = row({ id: "crs_lab", billing: "once", priceCents: 4000, access: "purchase" });
    const items = listingEditItems(banner, [hidden, priced]);
    assert.equal(items[0]?.priceEditable, false);
    assert.equal(items[0]?.priceNote, programEditCopy.bannerPrice);
    assert.equal(items[1]?.priceNote, programEditCopy.hiddenPrice);
    assert.equal(items[2]?.price, "40");
    assert.equal(detailEditItem(hidden).description, "A longer about section.");
    assert.equal(detailEditItem(hidden).priceEditable, false);
  });
});

describe("save", () => {
  it("rejects Mentor, Instructor, Student, and guests before reading or writing", async () => {
    for (const role of ["mentor", "instructor", "student", null]) {
      const db = memory([row({ id: "crs_dj" })]);
      const paths: string[] = [];
      const result = await persistProgramEdits({
        role,
        input: listingInput([text("crs_dj", { title: "Stolen" })]),
        store: db.store,
        revalidate: (path) => paths.push(path),
      });
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.message, programEditCopy.forbidden);
      assert.deepEqual(db.finds, []);
      assert.deepEqual(db.updates, []);
      assert.deepEqual(paths, []);
      assert.equal(db.rows[0]?.title, "DJ Bootcamp");
    }
  });

  it("does not write a Lead payload that fails validation", async () => {
    const db = memory([row({ id: "crs_dj" })]);
    const missing = await commitProgramEdits({
      role: "lead",
      input: listingInput([text("crs_dj", { title: "  " })]),
      store: db.store,
    });
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.equal(missing.fieldErrors["crs_dj.title"], programEditCopy.title);
    assert.deepEqual(db.finds, []);
    assert.deepEqual(db.updates, []);

    const priced = memory([row({ id: "crs_lab", billing: "monthly", priceCents: 2000 })]);
    const badPrice = await commitProgramEdits({
      role: "teacher",
      input: listingInput([text("crs_lab", { price: "20.555" })]),
      store: priced.store,
    });
    assert.equal(badPrice.ok, false);
    if (!badPrice.ok) assert.equal(badPrice.fieldErrors["crs_lab.price"], programEditCopy.price);
    assert.deepEqual(priced.updates, []);
    assert.equal(priced.rows[0]?.priceCents, 2000);
  });

  it("saves listing copy and leaves description, price, and catalog columns alone", async () => {
    const db = memory([
      row({ id: "crs_dj", description: "Keep this about text." }),
      row({ id: "crs_req", access: "request" }),
    ]);
    const paths: string[] = [];
    const result = await persistProgramEdits({
      role: "admin",
      input: listingInput([
        text("crs_dj", {
          title: " Decks ",
          tagline: "New line",
          statusLabel: "Open",
          presenter: "  ",
          description: "Should not save from the list",
          delivery: "live",
          setting: "in_person",
        }),
      ]),
      store: db.store,
      revalidate: (path) => paths.push(path),
    });
    assert.deepEqual(result, { ok: true });
    assert.equal(db.rows[0]?.title, "Decks");
    assert.equal(db.rows[0]?.tagline, "New line");
    assert.equal(db.rows[0]?.statusLabel, "Open");
    assert.equal(db.rows[0]?.presenter, null);
    assert.equal(db.rows[0]?.description, "Keep this about text.");
    assert.equal(db.rows[0]?.priceCents, null);
    assert.equal(db.rows[0]?.access, "cohort");
    assert.equal(db.rows[0]?.billing, "application");
    assert.equal(db.rows[0]?.placement, "grid");
    assert.deepEqual(Object.keys(db.updates[0]?.data ?? {}).sort(), ["presenter", "statusLabel", "tagline", "title"]);
    assert.deepEqual(paths, ["/", "/programs/crs_dj"]);
    assert.equal(db.rows[1]?.title, "DJ Bootcamp");
  });

  it("rejects a price edit when the page does not store that price", async () => {
    const banner = row({
      id: "crs_head",
      slug: "headliner",
      placement: "banner",
      access: "headliner",
      billing: "monthly",
      priceCents: null,
    });
    const db = memory([banner, row({ id: "crs_dj" })]);
    const blocked = await commitProgramEdits({
      role: "lead",
      input: listingInput([text("crs_head", { title: "Headliner", price: "15" }), text("crs_dj", { price: "15" })]),
      store: db.store,
    });
    assert.equal(blocked.ok, false);
    if (!blocked.ok) {
      assert.equal(blocked.fieldErrors["crs_head.price"], programEditCopy.priceLocked);
      assert.equal(blocked.fieldErrors["crs_dj.price"], programEditCopy.priceLocked);
    }
    assert.deepEqual(db.updates, []);
    assert.equal(db.rows[0]?.title, "DJ Bootcamp");
  });

  it("saves a program price and the about text, then revalidates", async () => {
    const db = memory([
      row({
        id: "crs_lab",
        slug: "studio-lab",
        billing: "monthly",
        access: "purchase",
        priceCents: 2000,
        presenter: "Ash",
      }),
    ]);
    const paths: string[] = [];
    const result = await persistProgramEdits({
      role: "lead",
      input: {
        scope: "detail",
        programs: [
          text("crs_lab", {
            title: "Studio Lab",
            presenter: "Ash F",
            description: "Bring one track.",
            price: "20.50",
            slug: "stolen-slug",
            access: "open",
            billing: "once",
            placement: "banner",
          }),
        ],
      },
      store: db.store,
      revalidate: (path) => paths.push(path),
    });
    assert.deepEqual(result, { ok: true });
    assert.equal(db.rows[0]?.title, "Studio Lab");
    assert.equal(db.rows[0]?.presenter, "Ash F");
    assert.equal(db.rows[0]?.description, "Bring one track.");
    assert.equal(db.rows[0]?.priceCents, 2050);
    assert.equal(db.rows[0]?.slug, "studio-lab");
    assert.equal(db.rows[0]?.access, "purchase");
    assert.equal(db.rows[0]?.billing, "monthly");
    assert.equal(db.rows[0]?.placement, "grid");
    assert.deepEqual(paths, ["/", "/programs/studio-lab"]);
  });

  it("clears a stored price when the price field is emptied", async () => {
    const db = memory([row({ id: "crs_lab", billing: "once", access: "purchase", priceCents: 5000 })]);
    const result = await commitProgramEdits({
      role: "lead",
      input: listingInput([text("crs_lab", { price: " " })]),
      store: db.store,
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.deepEqual(result.paths, ["/", "/programs/crs_lab"]);
    assert.equal(db.rows[0]?.priceCents, null);
  });

  it("does not write or revalidate when the Lead did not change anything", async () => {
    const db = memory([row({ id: "crs_dj" })]);
    const paths: string[] = [];
    const result = await persistProgramEdits({
      role: "lead",
      input: listingInput([text("crs_dj")]),
      store: db.store,
      revalidate: (path) => paths.push(path),
    });
    assert.deepEqual(result, { ok: true });
    assert.deepEqual(db.updates, []);
    assert.deepEqual(paths, []);
  });

  it("rejects programs that are not on that page", async () => {
    const db = memory([
      row({ id: "crs_req", access: "request" }),
      row({ id: "crs_head", placement: "banner", access: "headliner", slug: "headliner" }),
      row({ id: "crs_gone" }),
    ]);
    const missing = await commitProgramEdits({
      role: "lead",
      input: listingInput([text("missing")]),
      store: db.store,
    });
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.equal(missing.message, programEditCopy.missing);
    const hidden = await commitProgramEdits({
      role: "lead",
      input: listingInput([text("crs_req", { title: "No" })]),
      store: db.store,
    });
    assert.equal(hidden.ok, false);
    const detailBanner = await commitProgramEdits({
      role: "lead",
      input: { scope: "detail", programs: [text("crs_head", { description: "No", title: "Headliner" })] },
      store: db.store,
    });
    assert.equal(detailBanner.ok, false);
    const two = await commitProgramEdits({
      role: "lead",
      input: { scope: "detail", programs: [text("crs_gone"), text("crs_req")] },
      store: db.store,
    });
    assert.equal(two.ok, false);
    if (!two.ok) assert.equal(two.message, programEditCopy.invalid);
    assert.deepEqual(db.updates, []);
    assert.equal(db.rows[0]?.title, "DJ Bootcamp");
  });

  it("keeps a blank label and still saves the title", async () => {
    const db = memory([row({ id: "crs_fb", statusLabel: "", title: "FB2B" })]);
    const result = await commitProgramEdits({
      role: "lead",
      input: listingInput([text("crs_fb", { title: "FB2B Live", statusLabel: "" })]),
      store: db.store,
    });
    assert.equal(result.ok, true);
    assert.equal(db.rows[0]?.title, "FB2B Live");
    assert.equal(db.rows[0]?.statusLabel, "");
  });

  it("refuses a hidden plan row on the list and the program page", async () => {
    const db = memory([
      row({
        id: "crs_plan",
        slug: "intro-plan",
        placement: "plan",
        access: "subscription",
        billing: "monthly",
        priceCents: 2000,
        title: "Intro plan",
      }),
    ]);
    const listing = await commitProgramEdits({
      role: "lead",
      input: listingInput([text("crs_plan", { title: "Intro plan", price: "25" })]),
      store: db.store,
    });
    assert.equal(listing.ok, false);
    if (!listing.ok) assert.equal(listing.message, programEditCopy.missing);
    const detail = await commitProgramEdits({
      role: "lead",
      input: { scope: "detail", programs: [text("crs_plan", { title: "Intro plan", description: "Nope", price: "25" })] },
      store: db.store,
    });
    assert.equal(detail.ok, false);
    assert.deepEqual(db.updates, []);
    assert.equal(db.rows[0]?.priceCents, 2000);
  });

  it("revalidates the Headliner page when that course copy changes", async () => {
    const db = memory([
      row({
        id: "crs_head",
        slug: "headliner",
        placement: "banner",
        access: "headliner",
        billing: "monthly",
        title: "Headliner",
      }),
    ]);
    const result = await commitProgramEdits({
      role: "lead",
      input: listingInput([text("crs_head", { title: "Headliner Club", tagline: "Weekly sets." })]),
      store: db.store,
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.deepEqual(result.paths, ["/", "/headliner"]);
    assert.equal(db.rows[0]?.title, "Headliner Club");
    assert.equal(db.rows[0]?.priceCents, null);
  });
});
