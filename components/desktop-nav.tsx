"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { createPortal } from "react-dom";
import { NavPending } from "./nav-pending";

export type DesktopNavLink = {
  key: string;
  href: string;
  label: string;
  className?: string;
  current: boolean;
};

function LinkCue({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  if (!pending || typeof document === "undefined") return null;
  return createPortal(<NavPending label={label} />, document.body);
}

export function DesktopNav({ links }: { links: DesktopNavLink[] }) {
  return (
    <nav className="nav-desktop" aria-label="Academy">
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
    </nav>
  );
}
