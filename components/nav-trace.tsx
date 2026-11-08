"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import {
  NAV_TRACE_KEY,
  USABLE_TIMEOUT_MS,
  appendSample,
  documentSample,
  headerDestination,
  isAuthRedirect,
  normalizePath,
  parseState,
  reloadedClickSample,
  seeLoadingShell,
  serializeState,
  sameUrlSample,
  softClickSample,
  summarizeLongTasks,
  usableSelector,
  type PendingClick,
  type ResourceSnap,
  type TraceState,
} from "@/lib/nav-trace";

const enabled = process.env.NODE_ENV === "development";
/** One document row per page load. Strict mode runs the effect twice. */
let recordedDocumentOrigin = -1;
const longTaskBuffer: { startTime: number; duration: number }[] = [];

if (enabled && typeof window !== "undefined") {
  try {
    performance.setResourceTimingBufferSize?.(500);
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType !== "longtask") continue;
        longTaskBuffer.push({ startTime: entry.startTime, duration: entry.duration });
      }
    });
    observer.observe({ type: "longtask", buffered: true });
  } catch {
    // Some browsers have no long-task timing. Fetch and usable times still record.
  }
}

type ActiveClick = PendingClick & {
  id: number;
  clickAt: number;
  commitAt: number | null;
  loadingSeen: boolean;
};

function readState(): TraceState {
  try {
    return parseState(sessionStorage.getItem(NAV_TRACE_KEY));
  } catch {
    return parseState(null);
  }
}

function writeState(state: TraceState) {
  try {
    sessionStorage.setItem(NAV_TRACE_KEY, serializeState(state));
  } catch {
    // A full or blocked store must not stop the click.
  }
}

function signedInNow(): boolean | null {
  if (document.querySelector("header.site-header .user")) return true;
  if (document.querySelector("header.site-header .public-auth")) return false;
  return null;
}

function loadingNotePresent(): boolean {
  return Boolean(document.querySelector("main.shell > p.note"));
}

function resourceSnaps(): ResourceSnap[] {
  try {
    return performance.getEntriesByType("resource").map((entry) => {
      const resource = entry as PerformanceResourceTiming;
      return {
        name: resource.name,
        startTime: resource.startTime,
        responseEnd: resource.responseEnd,
        decodedBodySize: resource.decodedBodySize,
        transferSize: resource.transferSize,
        initiatorType: resource.initiatorType,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Records menu clicks in development. Renders nothing.
 * Listeners do not cancel the click, so the link behaves as it does without this.
 */
export function NavTrace() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const active = useRef<ActiveClick | null>(null);

  useLayoutEffect(() => {
    if (!enabled) return;
    if (recordedDocumentOrigin === performance.timeOrigin) return;
    let cancelled = false;
    const hydratedMs = performance.now();
    const started = performance.now();
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;

    const writeDocument = () => {
      if (cancelled || recordedDocumentOrigin === performance.timeOrigin) return;
      const path = normalizePath(window.location.pathname);
      const selector = usableSelector(path);
      const usable = Boolean(document.querySelector(selector));
      const loadingSeen = seeLoadingShell(path, usable, loadingNotePresent());
      const timedOut = !usable && performance.now() - started >= USABLE_TIMEOUT_MS;
      if (!usable && !timedOut) {
        requestAnimationFrame(writeDocument);
        return;
      }
      recordedDocumentOrigin = performance.timeOrigin;
      const now = new Date().toISOString();
      let state = readState();
      if (state.pending) {
        state = appendSample(
          state,
          reloadedClickSample(state.pending, {
            at: now,
            epoch: Date.now(),
            landed: path,
            navigationType: navigation?.type ?? null,
            usable,
            usableSelector: selector,
            loadingSeen,
            timedOut,
          }),
          null,
        );
      }
      state = appendSample(
        state,
        documentSample({
          n: state.next,
          at: now,
          path,
          signedIn: signedInNow(),
          navigationType: navigation?.type ?? null,
          ttfbMs: navigation?.responseStart ?? 0,
          responseMs: navigation ? navigation.responseEnd - navigation.requestStart : 0,
          domContentLoadedMs: navigation?.domContentLoadedEventEnd ?? 0,
          loadEventMs: navigation?.loadEventEnd ?? 0,
          decodedBytes: navigation?.decodedBodySize ?? 0,
          transferBytes: navigation?.transferSize ?? 0,
          hydratedMs,
          usableMs: usable ? performance.now() : null,
          usableSelector: usable ? selector : null,
          loadingSeen,
          timedOut,
          longTasks: summarizeLongTasks(longTaskBuffer, 0, performance.now()),
        }),
        null,
      );
      writeState(state);
    };

    writeDocument();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let gen = 0;
    let frame = 0;

    const closeActive = (flags: { replaced: boolean; timedOut: boolean }) => {
      const current = active.current;
      if (!current) return;
      const path = normalizePath(pathRef.current || window.location.pathname);
      const selector = usableSelector(path);
      const landedOnTarget = path === current.to || isAuthRedirect(current.to, path);
      const hasUsable = landedOnTarget && Boolean(document.querySelector(selector));
      const finish = performance.now();
      const sample = softClickSample(current, {
        atFinish: finish,
        landed: path,
        commitAt: current.commitAt,
        usableAt: hasUsable && !flags.replaced ? finish : null,
        usableSelector: hasUsable && !flags.replaced ? selector : null,
        loadingSeen: current.loadingSeen,
        timedOut: flags.timedOut,
        replaced: flags.replaced,
        resources: resourceSnaps(),
        longTasks: longTaskBuffer,
      });
      active.current = null;
      writeState(appendSample(readState(), sample, null));
    };

    const tick = (id: number) => {
      const current = active.current;
      if (!current || current.id !== id) return;
      const path = normalizePath(pathRef.current || window.location.pathname);
      if ((path === current.to || isAuthRedirect(current.to, path)) && current.commitAt == null) {
        current.commitAt = performance.now();
      }
      const selector = usableSelector(path);
      const hasUsable = Boolean(document.querySelector(selector));
      if (seeLoadingShell(path, hasUsable, loadingNotePresent())) current.loadingSeen = true;
      const landedOnTarget = path === current.to || isAuthRedirect(current.to, path);
      if (landedOnTarget && hasUsable) {
        closeActive({ replaced: false, timedOut: false });
        return;
      }
      if (performance.now() - current.clickAt >= USABLE_TIMEOUT_MS) {
        closeActive({ replaced: false, timedOut: true });
        return;
      }
      frame = requestAnimationFrame(() => tick(id));
    };

    const onClick = (event: MouseEvent) => {
      try {
      const element = event.target instanceof Element ? event.target.closest("a") : null;
      let pathname = "";
      let sameOrigin = false;
      if (element) {
        try {
          const url = new URL(element.href, window.location.href);
          pathname = url.pathname;
          sameOrigin = url.origin === window.location.origin;
        } catch {
          pathname = "";
        }
      }
      const to = headerDestination({
        button: event.button,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        anchor: element
          ? {
              pathname,
              sameOrigin,
              target: element.target,
              download: element.hasAttribute("download"),
              inHeader: Boolean(element.closest("header.site-header")),
            }
          : null,
      });
      if (!to) return;

      const clickAt = performance.now();
      const from = normalizePath(pathRef.current || window.location.pathname);
      const snaps = resourceSnaps();
      const early = softClickSample(
        {
          n: 0,
          at: new Date().toISOString(),
          epoch: Date.now(),
          from,
          to,
          signedIn: signedInNow(),
          inFlightAtClick: 0,
          inFlightPaths: [],
          prefetchHit: false,
          clickAt,
        },
        {
          atFinish: clickAt,
          landed: from,
          commitAt: null,
          usableAt: null,
          usableSelector: null,
          loadingSeen: false,
          timedOut: false,
          replaced: false,
          resources: snaps,
          longTasks: [],
        },
      );

      if (active.current) closeActive({ replaced: true, timedOut: false });
      const state = readState();
      const n = state.next;
      const click: PendingClick = {
        n,
        at: new Date().toISOString(),
        epoch: Date.now(),
        from,
        to,
        signedIn: signedInNow(),
        inFlightAtClick: early.inFlightAtClick,
        inFlightPaths: early.inFlightPaths,
        prefetchHit: early.prefetchHit,
      };
      if (to === from) {
        writeState(appendSample(state, sameUrlSample(click, from), null));
        return;
      }
      const id = ++gen;
      active.current = { ...click, id, clickAt, commitAt: null, loadingSeen: false };
      writeState({ ...state, next: n + 1, pending: click });
      frame = requestAnimationFrame(() => tick(id));
      } catch {
        // Leave the click alone.
      }
    };

    document.addEventListener("click", onClick, true);
    return () => {
      gen += 1;
      cancelAnimationFrame(frame);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
