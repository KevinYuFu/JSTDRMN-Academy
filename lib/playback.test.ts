import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runtimeSeconds } from "./playback";

describe("runtimeSeconds", () => {
  it("reads hours, minutes, and a single number", () => {
    assert.equal(runtimeSeconds("1:02:03"), 3723);
    assert.equal(runtimeSeconds("4:05"), 245);
    assert.equal(runtimeSeconds("90"), 90);
  });

  it("falls back to a minute when the label is not a time", () => {
    assert.equal(runtimeSeconds("soon"), 60);
    assert.equal(runtimeSeconds("1:xx"), 60);
  });
});
