"use client";

import { useEffect, useState } from "react";
import styles from "./nav-pending.module.css";

export function NavPending({ label }: { label: string }) {
  return (
    <>
      <span className={styles.bar} data-nav-pending={label} aria-hidden="true" />
      <span className={styles.live} role="status">
        Loading {label}
      </span>
    </>
  );
}

let historyPending = false;
const subscribers = new Set<() => void>();
let watch: MutationObserver | null = null;
let timer = 0;

function publish() {
  for (const subscriber of subscribers) subscriber();
}

function stopHistory() {
  watch?.disconnect();
  watch = null;
  window.clearTimeout(timer);
  timer = 0;
  if (!historyPending) return;
  historyPending = false;
  publish();
}

function installHistory() {
  if (typeof window === "undefined") return;
  const marker = "__academyNavHistory";
  if (marker in window) return;
  Object.defineProperty(window, marker, { value: true });
  window.addEventListener(
    "popstate",
    () => {
      const before = document.querySelector("main")?.innerHTML ?? "";
      const started = performance.now();
      historyPending = true;
      publish();
      watch?.disconnect();
      window.clearTimeout(timer);
      watch = new MutationObserver(() => {
        const next = document.querySelector("main")?.innerHTML ?? "";
        if (next === before) return;
        watch?.disconnect();
        watch = null;
        const wait = Math.max(0, 200 - (performance.now() - started));
        timer = window.setTimeout(stopHistory, wait);
      });
      watch.observe(document.body, { childList: true, subtree: true, characterData: true });
      timer = window.setTimeout(stopHistory, 8000);
    },
    true,
  );
}

export function HistoryPending() {
  const [, bump] = useState(0);
  useEffect(() => {
    installHistory();
    const update = () => bump((value) => value + 1);
    subscribers.add(update);
    if (historyPending) update();
    return () => {
      subscribers.delete(update);
    };
  }, []);
  if (!historyPending) return null;
  return <NavPending label="page" />;
}
