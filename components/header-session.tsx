import Link from "next/link";
import { getUser } from "@/lib/auth";
import { academyNav } from "@/lib/nav";
import { HeaderNav } from "./header-nav";
import { UserMenu } from "./user-menu";
import styles from "./header-session.module.css";

function PublicAuth() {
  return (
    <div className="public-auth">
      <Link href="/login" prefetch={false} className="pill pill-black">
        Log in
      </Link>
      <Link href="/signup" prefetch={false} className="pill pill-purple">
        Sign up
      </Link>
    </div>
  );
}

/**
 * Neutral slot. No login links, avatar, or staff item.
 * On a wide screen it holds the width of Log in / Sign up, so the nav stays put for a guest.
 * On a phone it is hidden: the closed bar is only the logo and the menu button.
 */
export function HeaderSessionFallback() {
  return (
    <>
      <div className="header-menu" id="academy-menu">
        <HeaderNav links={academyNav(null)} />
      </div>
      <span className={styles.slot} aria-hidden="true">
        <span className={styles.mark} />
      </span>
    </>
  );
}

export async function HeaderSession() {
  const user = await getUser();
  return (
    <>
      <div className="header-menu" id="academy-menu">
        <HeaderNav links={academyNav(user?.role ?? null)} />
        {user ? null : <PublicAuth />}
      </div>
      {user ? <UserMenu name={user.name} initial={user.name.slice(0, 1).toUpperCase()} /> : null}
    </>
  );
}
