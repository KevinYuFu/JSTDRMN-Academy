"use client";

import { useState } from "react";
import { logout } from "@/app/actions";
import { Icon } from "./icons";
import { NavPending } from "./nav-pending";

export function MobileNav({
  links,
  signedIn,
}: {
  links: { href: string; label: string; external?: boolean; variant?: "staff"; current?: boolean }[];
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  return (
    <>
      <button
        className="menu-btn"
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="academy-menu"
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name={open ? "close" : "menu"} />
      </button>
      <nav id="academy-menu" className={open ? "mobile-panel open" : "mobile-panel"} aria-label="Academy" aria-hidden={open ? undefined : true}>
        {links.map((link) => {
          const names = [link.current ? "active" : "", link.variant === "staff" ? "nav-staff" : ""].filter(Boolean);
          return (
            <a
              key={link.href + link.label}
              href={link.href}
              className={names.length > 0 ? names.join(" ") : undefined}
              aria-current={link.current ? "page" : undefined}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noreferrer" : undefined}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                if (link.external || link.href === window.location.pathname) return;
                setPendingHref(link.href);
              }}
            >
              {link.label}
            </a>
          );
        })}
        {links
          .filter((link) => link.href === pendingHref)
          .map((link) => <NavPending key={link.href} label={link.label} />)}
        {signedIn ? (
          <form action={logout}>
            <button type="submit">Log out</button>
          </form>
        ) : (
          <>
            <a href="/login">Log in</a>
            <a href="/signup">Sign up</a>
          </>
        )}
      </nav>
    </>
  );
}
