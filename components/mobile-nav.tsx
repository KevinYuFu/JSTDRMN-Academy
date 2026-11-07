"use client";

import { useState } from "react";
import { logout } from "@/app/actions";
import { Icon } from "./icons";

export function MobileNav({
  links,
  signedIn,
}: {
  links: { href: string; label: string; external?: boolean; variant?: "staff"; current?: boolean }[];
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
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
            >
              {link.label}
            </a>
          );
        })}
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
