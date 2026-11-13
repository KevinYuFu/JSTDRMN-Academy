"use client";

import { useEffect, useState } from "react";
import { logout } from "@/app/actions";
import { Icon } from "./icons";

export function UserMenu({ name, initial }: { name: string; initial: string }) {
  const [open, setOpen] = useState(false);
  const first = name.split(" ")[0] || name;

  useEffect(() => {
    const onNav = () => setOpen(false);
    window.addEventListener("academy-nav-open", onNav);
    return () => window.removeEventListener("academy-nav-open", onNav);
  }, []);

  return (
    <div className="user">
      <span className="bell" title="No new notes">
        <Icon name="bell" />
      </span>
      <span className="user-name">Hi, {first}</span>
      <button
        className="avatar"
        type="button"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() =>
          setOpen((value) => {
            const next = !value;
            if (next) window.dispatchEvent(new Event("academy-account-open"));
            return next;
          })
        }
      >
        {initial}
      </button>
      {open ? (
        <div className="user-menu">
          <form action={logout}>
            <button type="submit">Log out</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
