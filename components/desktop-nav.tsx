"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { createContext, useContext, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { HistoryPending, NavPending } from "./nav-pending";

export type DesktopNavLink = {
  key: string;
  href: string;
  label: string;
  className?: string;
  current: boolean;
};

const PendingLabel = createContext<Dispatch<SetStateAction<string | null>>>(() => {});

function LinkCue({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  const setLabel = useContext(PendingLabel);

  useEffect(() => {
    if (!pending) return;
    setLabel(label);
    return () => setLabel((current) => (current === label ? null : current));
  }, [pending, label, setLabel]);

  return null;
}

export function DesktopNav({ links }: { links: DesktopNavLink[] }) {
  const [label, setLabel] = useState<string | null>(null);
  return (
    <nav className="nav-desktop" aria-label="Academy">
      <PendingLabel.Provider value={setLabel}>
        {links.map((link) => (
          <Link
            key={link.key}
            href={link.href}
            className={link.className}
            aria-current={link.current ? "page" : undefined}
          >
            {link.label}
            <LinkCue label={link.label} />
          </Link>
        ))}
      </PendingLabel.Provider>
      {label ? <NavPending label={label} /> : null}
      <HistoryPending />
    </nav>
  );
}
