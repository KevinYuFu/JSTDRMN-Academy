import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { blockedPreviewPort, classifyLoopbackLookup, lookupFailureIsFatal, parsePreviewArgs } from "../scripts/local-preview.mjs";
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

  it("treats a missing OS name as non-fatal and a public address as fatal", () => {
    assert.equal(lookupFailureIsFatal("ENOTFOUND"), false);
    assert.equal(lookupFailureIsFatal("EAI_AGAIN"), false);
    assert.equal(lookupFailureIsFatal("ENODATA"), false);
    assert.equal(lookupFailureIsFatal("ECONNREFUSED"), true);
    assert.equal(classifyLoopbackLookup([]), "absent");
    assert.equal(classifyLoopbackLookup(["127.0.0.1", "::1"]), "loopback");
    assert.equal(classifyLoopbackLookup(["203.0.113.5"]), "public");
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
