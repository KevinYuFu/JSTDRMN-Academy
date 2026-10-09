import Image from "next/image";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import { hubspotLinks } from "@/lib/config";
import { isStaff } from "@/lib/entitlements";
import { Icon } from "./icons";
import { MobileNav } from "./mobile-nav";

const links = [
  { href: hubspotLinks.about, label: "About", icon: "cloud" as const, external: true },
  { href: hubspotLinks.community, label: "Community", icon: "heart" as const, external: true },
  { href: hubspotLinks.showcases, label: "Showcases", icon: "spark" as const, external: true },
  { href: "/", label: "Academy", icon: "school" as const },
  { href: hubspotLinks.label, label: "Label", icon: "disc" as const, external: true },
  { href: hubspotLinks.management, label: "Management", icon: "trophy" as const, external: true },
];

export async function PublicHeader() {
  const user = await getUser();
  const home = user ? (isStaff(user.role) ? "/teacher" : "/dashboard") : "/login";
  return (
    <header className="public-header">
      <Link href="/" className="brand">
        <Image src="/logo.png" alt="JSTDRMN" width={156} height={34} priority className="logo" />
      </Link>
      <nav className="public-nav" aria-label="JSTDRMN">
        {links.map((link) => (
          <a key={link.label} href={link.href} className={link.label === "Academy" ? "active" : undefined} target={link.external ? "_blank" : undefined} rel={link.external ? "noreferrer" : undefined}>
            <Icon name={link.icon} />
            {link.label}
          </a>
        ))}
      </nav>
      <div className="public-auth">
        {user ? (
          <Link href={home} className="pill pill-purple">Enter</Link>
        ) : (
          <>
            <Link href="/login" className="pill pill-black">Log in</Link>
            <Link href="/signup" className="pill pill-purple">Sign up</Link>
          </>
        )}
        <MobileNav
          signedIn={Boolean(user)}
          links={[
            ...links.map((link) => ({ href: link.href, label: link.label, external: link.external })),
            { href: "/", label: "Programs" },
          ]}
        />
      </div>
    </header>
  );
}
