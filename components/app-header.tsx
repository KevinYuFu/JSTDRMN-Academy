import Image from "next/image";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import { academyNav } from "@/lib/nav";
import { isStaff } from "@/lib/entitlements";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";

export async function AppHeader({ active }: { active?: string | null }) {
  const user = await getUser();
  const staff = user ? isStaff(user.role) : false;
  const links = academyNav(user?.role ?? null);
  return (
    <header className="site-header">
      <Link href={user ? (staff ? "/teacher" : "/dashboard") : "/"} className="brand">
        <Image src="/logo.png" alt="JSTDRMN" width={156} height={34} priority className="logo" />
        <span className="tag">Academy</span>
      </Link>
      <nav className="nav-desktop" aria-label="Academy">
        {links.map((link) => (
          <Link key={link.key} href={link.href} className={link.key === active ? "active" : undefined}>
            {link.label}
          </Link>
        ))}
      </nav>
      {user ? (
        <UserMenu name={user.name} initial={user.name.slice(0, 1).toUpperCase()} />
      ) : (
        <div className="public-auth">
          <Link href="/login" className="pill pill-black">Log in</Link>
          <Link href="/signup" className="pill pill-purple">Sign up</Link>
        </div>
      )}
      <MobileNav signedIn={Boolean(user)} links={links.map((link) => ({ href: link.href, label: link.label }))} />
    </header>
  );
}
