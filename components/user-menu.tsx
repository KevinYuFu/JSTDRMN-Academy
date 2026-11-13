"use client";

import { logout } from "@/app/actions";
import { useHeaderMenu } from "./header-frame";
import { Icon } from "./icons";

export function UserMenu({ name, initial }: { name: string; initial: string }) {
  const { accountOpen, toggleAccount } = useHeaderMenu();
  const first = name.split(" ")[0] || name;
  return (
    <div className="user">
      <span className="bell" title="No new notes">
        <Icon name="bell" />
      </span>
      <span className="user-name">Hi, {first}</span>
      <button className="avatar" type="button" aria-expanded={accountOpen} aria-label="Account menu" onClick={toggleAccount}>
        {initial}
      </button>
      {accountOpen ? (
        <div className="user-menu">
          <form action={logout}>
            <button type="submit">Log out</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
