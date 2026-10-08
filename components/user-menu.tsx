"use client";

import { useState } from "react";
import { logout } from "@/app/actions";
import { Icon } from "./icons";

export function UserMenu({ name, initial }: { name: string; initial: string }) {
  const [open, setOpen] = useState(false);
  const first = name.split(" ")[0] || name;
  return (
    <div className="user">
      <span className="bell" title="No new notes">
        <Icon name="bell" />
      </span>
      <span className="user-name">Hi, {first}</span>
      <button className="avatar" type="button" aria-expanded={open} aria-label="Account menu" onClick={() => setOpen((value) => !value)}>
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
