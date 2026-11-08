import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isolateEditAction } from "./edit-isolation";

describe("edit isolation", () => {
  it("lets field clicks stay in the field and blocks the surrounding link", () => {
    assert.equal(isolateEditAction({ type: "click", inField: true, inChrome: false }), "contain");
    assert.equal(isolateEditAction({ type: "auxclick", inField: true, inChrome: false }), "contain");
    assert.equal(isolateEditAction({ type: "keydown", key: "Enter", inField: true, inChrome: false }), "ignore");
    assert.equal(isolateEditAction({ type: "keydown", key: "a", inField: true, inChrome: false }), "ignore");
  });

  it("leaves Save and Cancel alone", () => {
    assert.equal(isolateEditAction({ type: "click", inField: false, inChrome: true }), "allow");
    assert.equal(isolateEditAction({ type: "keydown", key: "Enter", inField: false, inChrome: true }), "allow");
  });

  it("blocks navigation clicks, modified clicks, and Enter or Space on other controls", () => {
    assert.equal(isolateEditAction({ type: "click", inField: false, inChrome: false }), "block");
    assert.equal(isolateEditAction({ type: "auxclick", inField: false, inChrome: false }), "block");
    assert.equal(isolateEditAction({ type: "keydown", key: "Enter", inField: false, inChrome: false }), "block");
    assert.equal(isolateEditAction({ type: "keyup", key: " ", inField: false, inChrome: false }), "block");
    assert.equal(isolateEditAction({ type: "submit", inField: false, inChrome: false }), "block");
  });

  it("does not swallow typing, Tab, or Escape", () => {
    assert.equal(isolateEditAction({ type: "keydown", key: "Tab", inField: false, inChrome: false }), "ignore");
    assert.equal(isolateEditAction({ type: "keydown", key: "Escape", inField: false, inChrome: false }), "ignore");
    assert.equal(isolateEditAction({ type: "keydown", key: "r", inField: false, inChrome: false }), "ignore");
  });
});
