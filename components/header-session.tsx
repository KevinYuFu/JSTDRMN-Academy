import Link from "next/link";
import { getUser } from "@/lib/auth";
import { academyNav } from "@/lib/nav";
import { HeaderNav } from "./header-nav";
import { UserMenu } from "./user-menu";

function PublicAuth() {
  return (
    <div className="public-auth">
      <Link href="/login" className="pill pill-black">
        Log in
      </Link>
      <Link href="/signup" className="pill pill-purple">
        Sign up
      </Link>
    </div>
  );
}

/**
 * Guest controls. Log in / Sign up are a fixed width, unlike the name in the
 * avatar row, so this is the box that does not jump when a signed-out visit resolves.
 */
export function HeaderSessionFallback() {
  return (
    <div className="header-menu" id="academy-menu">
      <HeaderNav links={academyNav(null)} />
      <PublicAuth />
    </div>
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
