import Link from "next/link";
import { getUser } from "@/lib/auth";
import { academyNav } from "@/lib/nav";
import { HeaderNav } from "./header-nav";
import { UserMenu } from "./user-menu";

/** Logged-out header. This is the prerendered frame, and the fallback while the session streams. */
export function HeaderSessionFallback() {
  return (
    <div className="header-menu" id="academy-menu">
      <HeaderNav links={academyNav(null)} />
      <div className="public-auth">
        <Link href="/login" className="pill pill-black">
          Log in
        </Link>
        <Link href="/signup" className="pill pill-purple">
          Sign up
        </Link>
      </div>
    </div>
  );
}

/** User menu and staff links. Guests render the same frame as the fallback. */
export async function HeaderSession() {
  const user = await getUser();
  if (!user) return <HeaderSessionFallback />;
  return (
    <>
      <div className="header-menu" id="academy-menu">
        <HeaderNav links={academyNav(user.role)} />
      </div>
      <UserMenu name={user.name} initial={user.name.slice(0, 1).toUpperCase()} />
    </>
  );
}
