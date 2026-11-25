import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInlineEditState, reduceInlineEdit, type InlineEditEvent, type InlineEditState } from "./inline-edit";

function apply(state: InlineEditState<string>, ...events: InlineEditEvent<string>[]) {
  return events.reduce(reduceInlineEdit, state);
}

function editing(title = "Saved title") {
  return apply(createInlineEditState(title), { type: "edit" }, { type: "change", update: () => "Draft title" });
}

describe("inline edit", () => {
  it("starts on the saved text, closed", () => {
    const state = createInlineEditState("Saved title");
    assert.equal(state.editing, false);
    assert.equal(state.saving, false);
    assert.equal(state.message, null);
    assert.deepEqual(state.fieldErrors, {});
    assert.equal(state.draft, "Saved title");
    assert.equal(state.saved, "Saved title");
  });

  it("edit and cancel put the draft back to the saved text", () => {
    const opened = apply(createInlineEditState("Saved title"), { type: "edit" }, { type: "change", update: () => "Draft title" });
    assert.equal(apply(opened, { type: "edit" }).draft, "Saved title");
    const cancelled = apply(opened, { type: "cancel" });
    assert.equal(cancelled.editing, false);
    assert.equal(cancelled.draft, "Saved title");
    assert.equal(cancelled.saved, "Saved title");
    assert.equal(cancelled.message, null);
  });

  it("cancel restores the last saved value and does not replace it", () => {
    const savedOnce = apply(
      createInlineEditState("From the database"),
      { type: "edit" },
      { type: "change", update: () => "First save" },
      { type: "saving" },
      { type: "saved", value: "First save" },
    );
    const cancelled = apply(savedOnce, { type: "edit" }, { type: "change", update: () => "Not saved" }, { type: "cancel" });
    assert.equal(cancelled.draft, "First save");
    assert.equal(cancelled.saved, "First save");
    assert.equal(cancelled.editing, false);
    assert.notEqual(cancelled.saved, "Not saved");
  });

  it("ignores change when closed or while saving", () => {
    const closed = createInlineEditState("Saved title");
    assert.equal(apply(closed, { type: "change", update: () => "Nope" }), closed);
    const saving = apply(editing(), { type: "saving" });
    assert.equal(apply(saving, { type: "change", update: () => "Nope" }), saving);
  });

  it("keeps the error message while typing", () => {
    const failed = apply(editing(), {
      type: "failed",
      message: "Check the fields and try again.",
      fieldErrors: { title: "Add a title." },
    });
    const typed = apply(failed, { type: "change", update: (draft) => `${draft} again` });
    assert.equal(typed.message, "Check the fields and try again.");
    assert.equal(typed.fieldErrors.title, "Add a title.");
    assert.equal(typed.draft, "Draft title again");
    const retry = apply(failed, { type: "saving" });
    assert.equal(retry.saving, true);
    assert.equal(retry.message, "Check the fields and try again.");
  });

  it("saved closes and shows the new text immediately", () => {
    const saving = apply(editing("Old title"), { type: "saving" });
    const saved = apply(saving, { type: "saved", value: "New title" });
    assert.equal(saved.editing, false);
    assert.equal(saved.saving, false);
    assert.equal(saved.message, null);
    assert.deepEqual(saved.fieldErrors, {});
    assert.equal(saved.draft, "New title");
    assert.equal(saved.saved, "New title");
  });

  it("failed stays in edit and keeps the draft", () => {
    const draft = editing();
    const failed = apply(draft, {
      type: "failed",
      message: "Check the fields and try again.",
      fieldErrors: { title: "Add a title." },
    });
    assert.equal(failed.editing, true);
    assert.equal(failed.saving, false);
    assert.equal(failed.draft, "Draft title");
    assert.equal(failed.saved, "Saved title");
    assert.equal(failed.message, "Check the fields and try again.");
    assert.equal(failed.fieldErrors.title, "Add a title.");
  });

  it("clears field errors on edit, cancel, and saved", () => {
    const failed = apply(editing(), { type: "failed", message: "Check the fields and try again.", fieldErrors: { title: "Add a title." } });
    assert.deepEqual(apply(failed, { type: "edit" }).fieldErrors, {});
    assert.equal(apply(failed, { type: "edit" }).message, null);
    assert.deepEqual(apply(failed, { type: "cancel" }).fieldErrors, {});
    const saving = apply(editing(), { type: "saving" });
    assert.deepEqual(apply(saving, { type: "saved", value: "Draft title" }).fieldErrors, {});
    const bare = apply(editing(), { type: "failed", message: "Could not save. Try again." });
    assert.deepEqual(bare.fieldErrors, {});
  });

  it("ignores edit and cancel while saving", () => {
    const saving = apply(editing(), { type: "saving" });
    assert.equal(apply(saving, { type: "edit" }), saving);
    assert.equal(apply(saving, { type: "cancel" }), saving);
    const closed = { ...createInlineEditState("Saved title"), saving: true };
    assert.equal(apply(closed, { type: "saving" }), closed);
  });

  it("hide always resets, including while saving", () => {
    const saving = apply(editing(), { type: "failed", message: "Could not save. Try again.", fieldErrors: { title: "Add a title." } }, { type: "saving" });
    const hidden = apply(saving, { type: "hide" });
    assert.equal(hidden.editing, false);
    assert.equal(hidden.saving, false);
    assert.equal(hidden.draft, "Saved title");
    assert.equal(hidden.saved, "Saved title");
    assert.equal(hidden.message, null);
    assert.deepEqual(hidden.fieldErrors, {});
  });
});
