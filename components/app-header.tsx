import Image from "next/image";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import { academyNav } from "@/lib/nav";
import { HeaderFrame, MenuButton } from "./header-frame";
import { HeaderNav } from "./header-nav";
import { UserMenu } from "./user-menu";

export async function AppHeader() {
  const user = await getUser();
  const links = academyNav(user?.role ?? null);
  return (
    <HeaderFrame>
      <Link href="/" className="brand">
        <Image src="/logo.png" alt="JSTDRMN" width={256} height={57} priority className="logo" />
        <span className="tag">Academy</span>
      </Link>
      <div className="header-menu" id="academy-menu">
        <HeaderNav links={links} />
        {user ? null : (
          <div className="public-auth">
            <Link href="/login" className="pill pill-black">
              Log in
            </Link>
            <Link href="/signup" className="pill pill-purple">
              Sign up
            </Link>
          </div>
        )}
      </div>
      {user ? <UserMenu name={user.name} initial={user.name.slice(0, 1).toUpperCase()} /> : null}
      <MenuButton />
    </HeaderFrame>
  );
}
