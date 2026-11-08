"use client";

import { useEffect, useState, type ComponentType } from "react";

/**
 * Loads the click recorder only in development, and only after the page is up.
 * The import stays out of the production layout bundle.
 */
export function NavTraceSlot() {
  const [Trace, setTrace] = useState<ComponentType | null>(null);
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    let cancelled = false;
    void import("./nav-trace").then((mod) => {
      if (!cancelled) setTrace(() => mod.NavTrace);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  if (!Trace) return null;
  return <Trace />;
}
