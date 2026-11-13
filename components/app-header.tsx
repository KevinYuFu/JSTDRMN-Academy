import Image from "next/image";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import { academyNav, type AcademyNavItem } from "@/lib/nav";
import { HeaderFrame, MenuButton } from "./header-frame";
import { UserMenu } from "./user-menu";

function itemClass(link: AcademyNavItem, active?: string | null) {
  const names = [link.key === active ? "active" : "", link.variant === "staff" ? "nav-staff" : ""].filter(Boolean);
  return names.length > 0 ? names.join(" ") : undefined;
}

export async function AppHeader({ active }: { active?: string | null }) {
  const user = await getUser();
  const links = academyNav(user?.role ?? null);
  return (
    <HeaderFrame>
      <Link href="/" className="brand">
        <Image src="/logo.png" alt="JSTDRMN" width={256} height={57} priority className="logo" />
        <span className="tag">Academy</span>
      </Link>
      <div className="header-menu" id="academy-menu">
        <nav className="site-nav" aria-label="Academy">
          {links.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={itemClass(link, active)}
              aria-current={link.key === active ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
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
