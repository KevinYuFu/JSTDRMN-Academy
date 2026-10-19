"use client";

import { useState } from "react";
import { logout } from "@/app/actions";
import { Icon } from "./icons";

export function MobileNav({
  links,
  signedIn,
}: {
  links: { href: string; label: string; external?: boolean }[];
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="menu-btn" type="button" aria-label="Open menu" onClick={() => setOpen((value) => !value)}>
        <Icon name={open ? "close" : "menu"} />
      </button>
      <div className={open ? "mobile-panel open" : "mobile-panel"}>
        {links.map((link) => (
          <a key={link.href + link.label} href={link.href} target={link.external ? "_blank" : undefined} rel={link.external ? "noreferrer" : undefined}>
            {link.label}
          </a>
        ))}
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
      </div>
    </>
  );
}
