import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { blockedPreviewPort, parsePreviewArgs } from "../scripts/local-preview.mjs";
import {
  choosePort,
  isPreviewAppPort,
  isPreviewDbPort,
  parsePreviewHost,
  previewDatabaseName,
  previewPublicHost,
} from "../scripts/local-review-guard.mjs";

describe("named preview addresses", () => {
  it("keeps legacy ports out of the preview ranges", () => {
    assert.equal(isPreviewAppPort(43123), false);
    assert.equal(isPreviewAppPort(43124), false);
    assert.equal(isPreviewDbPort(55432), false);
    assert.equal(blockedPreviewPort(43123), true);
    assert.equal(blockedPreviewPort(43124), true);
    assert.equal(blockedPreviewPort(55432), true);
    assert.equal(parsePreviewHost("alpha.preview.localhost:43123"), null);
    assert.equal(parsePreviewHost("alpha.preview.localhost:43210")?.label, "alpha");
    assert.equal(previewPublicHost("cleanup", 43220), "cleanup.preview.localhost:43220");
    assert.equal(previewDatabaseName("lead-edit"), "jstdrmn_preview_lead_edit");
    assert.equal(choosePort(43200, 43202, (port: number) => port === 43200), 43201);
    assert.equal(choosePort(43123, 43124, (port: number) => blockedPreviewPort(port)), null);
  });

  it("requires a label and a branch, and does not invent one", () => {
    assert.deepEqual(parsePreviewArgs(["--label", "editor", "--branch", "cursor/program-lead-edit-9d9b"]), {
      label: "editor",
      branch: "cursor/program-lead-edit-9d9b",
      stop: false,
      status: false,
    });
    assert.throws(() => parsePreviewArgs(["--label", "Editor", "--branch", "main"]), /label/);
    assert.throws(() => parsePreviewArgs(["--label", "editor"]), /branch/);
  });
});
