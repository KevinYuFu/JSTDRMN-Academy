"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Escape returns to the parent branch. The Back link does the same. */
export function SkillTreeHotkeys({ backHref }: { backHref: string | null }) {
  const router = useRouter();
  useEffect(() => {
    if (!backHref) return;
    const href = backHref;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (document.querySelector("[data-lead-editor='edit']")) return;
      event.preventDefault();
      router.push(href);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [backHref, router]);
  return null;
}
