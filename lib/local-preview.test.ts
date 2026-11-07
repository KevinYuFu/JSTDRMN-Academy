import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import {
  blockedPreviewPort,
  classifyLoopbackLookup,
  lookupFailureIsFatal,
  parsePreviewArgs,
  remoteBranchRequest,
  resolvePreviewCommit,
} from "../scripts/local-preview.mjs";
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

  it("fetches a missing remote branch into a fresh single-branch checkout without creating a local branch", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "preview-refs-"));
    const remote = path.join(dir, "remote.git");
    const seed = path.join(dir, "seed");
    const clone = path.join(dir, "clone");
    const git = (args, cwd) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
    try {
      git(["init", "--bare", remote]);
      git(["clone", remote, seed]);
      git(["config", "user.email", "preview@example.com"], seed);
      git(["config", "user.name", "Preview"], seed);
      execFileSync("git", ["checkout", "-b", "tooling"], { cwd: seed });
      execFileSync("git", ["commit", "--allow-empty", "-m", "tooling"], { cwd: seed });
      git(["push", "origin", "tooling"], seed);
      execFileSync("git", ["checkout", "--orphan", "feature"], { cwd: seed });
      execFileSync("git", ["commit", "--allow-empty", "-m", "feature"], { cwd: seed });
      const featureSha = git(["rev-parse", "HEAD"], seed);
      git(["push", "origin", "feature"], seed);
      git(["clone", "--branch", "tooling", "--single-branch", remote, clone]);
      assert.throws(() => git(["rev-parse", "--verify", "origin/feature"], clone));
      assert.equal(remoteBranchRequest("origin/feature").name, "feature");
      const resolved = await resolvePreviewCommit("feature", clone);
      assert.equal(resolved, featureSha);
      assert.equal(git(["rev-parse", "refs/remotes/origin/feature"], clone), featureSha);
      assert.equal(git(["branch", "--list", "feature"], clone), "");
      await assert.rejects(
        () => resolvePreviewCommit("missing-feature", clone),
        /No branch named "missing-feature"/,
      );
      assert.equal(git(["branch", "--list", "missing-feature"], clone), "");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
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
