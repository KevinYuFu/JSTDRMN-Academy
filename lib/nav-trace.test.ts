import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  NAV_TRACE_KEY,
  USABLE_TIMEOUT_MS,
  appendSample,
  documentSample,
  emptyState,
  headerDestination,
  isAuthRedirect,
  normalizePath,
  parseState,
  reloadedClickSample,
  resourcePath,
  sameUrlSample,
  seeLoadingShell,
  serializeState,
  softClickSample,
  summarizeLongTasks,
  summarizeResources,
  usableSelector,
  type PendingClick,
  type TraceSample,
} from "./nav-trace";

const pending: PendingClick = {
  n: 4,
  at: "2026-11-08T05:12:00.000Z",
  epoch: 1_000,
  from: "/events",
  to: "/skill-tree",
  signedIn: true,
  inFlightAtClick: 0,
  inFlightPaths: [],
  prefetchHit: false,
};

describe("menu click destination", () => {
  it("keeps an ordinary header click and drops modified, off-header, and other-site clicks", () => {
    const anchor = {
      pathname: "/programs",
      sameOrigin: true,
      target: "",
      download: false,
      inHeader: true,
    };
    assert.equal(headerDestination({ button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, anchor }), "/programs");
    assert.equal(headerDestination({ button: 0, metaKey: true, ctrlKey: false, shiftKey: false, altKey: false, anchor }), null);
    assert.equal(headerDestination({ button: 1, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, anchor }), null);
    assert.equal(headerDestination({ button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, anchor: { ...anchor, inHeader: false } }), null);
    assert.equal(headerDestination({ button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, anchor: { ...anchor, sameOrigin: false } }), null);
    assert.equal(headerDestination({ button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, anchor: { ...anchor, target: "_blank" } }), null);
    assert.equal(headerDestination({ button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, anchor: null }), null);
  });

  it("strips a query before storing a path", () => {
    assert.equal(normalizePath("/dashboard/"), "/dashboard");
    assert.equal(resourcePath("http://nav-feedback-fixed.preview.localhost:43204/events?_rsc=secret-token"), "/events");
    assert.equal(resourcePath("not a url"), null);
  });
});

describe("usable page", () => {
  it("names the real content marker for each menu route", () => {
    assert.equal(usableSelector("/"), "#welcome-heading");
    assert.equal(usableSelector("/programs"), ".program-section, .headliner-banner");
    assert.equal(usableSelector("/skill-tree"), "main.stree-stage");
    assert.equal(usableSelector("/events"), "main.sessions-page h1");
    assert.equal(usableSelector("/dashboard"), "h1.page-title");
    assert.equal(usableSelector("/teacher"), "h1.page-title");
    assert.equal(usableSelector("/login"), ".auth-card h1");
  });

  it("does not put a loading boundary in front of My Courses", () => {
    assert.equal(existsSync(new URL("../app/dashboard/loading.tsx", import.meta.url)), false);
    const page = readFileSync(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8");
    assert.equal(page.includes("page-title"), true);
    assert.equal(page.includes("My Courses"), true);
    assert.equal(seeLoadingShell("/dashboard", false, true), true);
    assert.equal(seeLoadingShell("/dashboard", true, true), false);
    assert.equal(usableSelector("/dashboard"), "h1.page-title");
  });

  it("marks a staff click that lands on Log in", () => {
    assert.equal(isAuthRedirect("/teacher", "/login"), true);
    assert.equal(isAuthRedirect("/login", "/login"), false);
    assert.equal(isAuthRedirect("/programs", "/programs"), false);
  });
});

describe("request split", () => {
  it("keeps a slow request and a long task instead of dropping them", () => {
    const summary = summarizeResources({
      clickAt: 1_000,
      target: "/events",
      now: 2_800,
      resources: [
        {
          name: "http://preview.localhost:43204/skill-tree?_rsc=other-token",
          startTime: 900,
          responseEnd: 1_200,
          decodedBodySize: 10,
          transferSize: 10,
          initiatorType: "fetch",
        },
        {
          name: "http://preview.localhost:43204/events?_rsc=secret-token",
          startTime: 1_020,
          responseEnd: 2_720,
          decodedBodySize: 26_000,
          transferSize: 9_000,
          initiatorType: "fetch",
        },
      ],
    });
    assert.equal(JSON.stringify(summary).includes("secret"), false);
    assert.equal(JSON.stringify(summary).includes("_rsc"), false);
    assert.deepEqual(summary.inFlightPaths, ["/skill-tree"]);
    assert.equal(summary.inFlightAtClick, 1);
    assert.equal(summary.fetchStartMs, 20);
    assert.equal(summary.requestMs, 1_700);
    assert.equal(summary.waitedForResponseMs, 1_720);
    assert.equal(summary.usedInFlight, false);
    assert.equal(summary.decodedBytes, 26_000);

    const tasks = summarizeLongTasks(
      [
        { startTime: 500, duration: 40 },
        { startTime: 1_100, duration: 1_800 },
      ],
      1_000,
      2_800,
    );
    assert.deepEqual(tasks, { count: 1, totalMs: 1_800, maxMs: 1_800 });
  });

  it("separates a finished prefetch from the request that starts on the click", () => {
    const summary = summarizeResources({
      clickAt: 5_000,
      target: "/programs",
      now: 5_040,
      resources: [
        {
          name: "http://preview.localhost/programs?_rsc=prefetch-token",
          startTime: 1_000,
          responseEnd: 1_400,
          decodedBodySize: 100,
          transferSize: 100,
          initiatorType: "fetch",
        },
      ],
    });
    assert.equal(summary.prefetchHit, true);
    assert.equal(summary.requestMs, null);
    assert.equal(summary.fetchStartMs, null);
    assert.equal(summary.waitedForResponseMs, null);
  });
});

describe("samples", () => {
  it("records a soft click through to the real marker, including a timeout with no usable time", () => {
    const ready = softClickSample(
      { ...pending, clickAt: 100 },
      {
        atFinish: 183,
        landed: "/skill-tree",
        commitAt: 170,
        usableAt: 183,
        usableSelector: "main.stree-stage",
        loadingSeen: false,
        timedOut: false,
        replaced: false,
        resources: [],
        longTasks: [],
      },
    );
    assert.equal(ready.reload, false);
    assert.equal(ready.clock, "page");
    assert.equal(ready.clickToCommitMs, 70);
    assert.equal(ready.clickToUsableMs, 83);
    assert.equal(ready.timedOut, false);

    const tail = softClickSample(
      { ...pending, to: "/dashboard", clickAt: 100 },
      {
        atFinish: 100 + USABLE_TIMEOUT_MS,
        landed: "/dashboard",
        commitAt: 140,
        usableAt: null,
        usableSelector: null,
        loadingSeen: true,
        timedOut: true,
        replaced: false,
        resources: [],
        longTasks: [{ startTime: 200, duration: 900 }],
      },
    );
    assert.equal(tail.timedOut, true);
    assert.equal(tail.loadingSeen, true);
    assert.equal(tail.clickToUsableMs, null);
    assert.equal(tail.clickToCommitMs, 40);
    assert.equal(tail.longTasks.totalMs, 900);
    assert.equal(tail.authRedirect, false);
  });

  it("uses the wall clock when the click loads a new document", () => {
    const sample = reloadedClickSample(pending, {
      at: "2026-11-08T05:12:02.000Z",
      epoch: 2_800,
      landed: "/login",
      navigationType: "navigate",
      usable: true,
      usableSelector: ".auth-card h1",
      loadingSeen: false,
      timedOut: false,
    });
    assert.equal(sample.reload, true);
    assert.equal(sample.clock, "wall");
    assert.equal(sample.navigationType, "navigate");
    assert.equal(sample.clickToUsableMs, 1_800);
    assert.equal(sample.authRedirect, true);
    assert.equal(sample.landed, "/login");
  });

  it("keeps a same-page click out of the timeout bucket", () => {
    const sample = sameUrlSample(pending, "/events");
    assert.equal(sample.sameUrl, true);
    assert.equal(sample.timedOut, false);
    assert.equal(sample.clickToUsableMs, 0);
  });

  it("stores a document load without turning it into a click", () => {
    const sample = documentSample({
      n: 1,
      at: "2026-11-08T05:12:00.000Z",
      path: "/events",
      signedIn: false,
      navigationType: "navigate",
      ttfbMs: 31.4,
      responseMs: 32,
      domContentLoadedMs: 40,
      loadEventMs: 48,
      decodedBytes: 26_739,
      transferBytes: 9_000,
      hydratedMs: 55.2,
      usableMs: 55.2,
      usableSelector: "main.sessions-page h1",
      loadingSeen: false,
      timedOut: false,
      longTasks: { count: 0, totalMs: 0, maxMs: 0 },
    });
    assert.equal(sample.kind, "document");
    assert.equal(sample.reload, false);
    assert.equal(sample.signedIn, false);
    assert.equal(sample.ttfbMs, 31);
    assert.equal(sample.hydratedMs, 55);
    assert.equal(sample.clickToCommitMs, null);
  });

  it("round-trips the newest samples and drops a broken store", () => {
    let state = emptyState();
    for (let n = 1; n <= 45; n += 1) {
      state = appendSample(state, { ...sameUrlSample({ ...pending, n, to: "/events" }, "/events"), n } as TraceSample, null);
    }
    const restored = parseState(serializeState(state));
    assert.equal(restored.samples.length, 40);
    assert.equal(restored.samples[0]?.n, 6);
    assert.equal(restored.samples.at(-1)?.n, 45);
    assert.deepEqual(parseState("not json"), emptyState());
    assert.equal(serializeState(restored).includes("cookie"), false);
    assert.equal(NAV_TRACE_KEY, "jstdrmn-navtrace");
  });
});

describe("trace source", () => {
  it("does not read cookies or install itself outside development", () => {
    const probe = readFileSync(new URL("../components/nav-trace.tsx", import.meta.url), "utf8");
    const page = readFileSync(new URL("../app/nav-trace/page.tsx", import.meta.url), "utf8");
    const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
    assert.equal(probe.includes("document.cookie"), false);
    assert.equal(probe.includes("localStorage"), false);
    assert.equal(probe.includes("NODE_ENV"), true);
    assert.equal(probe.includes("preventDefault"), false);
    assert.equal(page.includes('NODE_ENV !== "development"'), true);
    assert.equal(layout.includes("NavTrace"), true);
  });
});
