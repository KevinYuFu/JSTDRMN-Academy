"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeNavKey } from "@/lib/active-nav";

type NavLink = {
  key: string;
  label: string;
  href: string;
  variant?: "staff";
};

function itemClass(link: NavLink, active: string | null) {
  const names = [link.key === active ? "active" : "", link.variant === "staff" ? "nav-staff" : ""].filter(Boolean);
  return names.length > 0 ? names.join(" ") : undefined;
}

/** Active highlight only. The rest of the header does not subscribe to the URL. */
export function HeaderNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const active = activeNavKey(pathname);
  return (
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
  );
}
