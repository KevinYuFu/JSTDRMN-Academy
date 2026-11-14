/**
 * Current nav item for a URL. This is the same highlight each page used to pass
 * as `active` on AppHeader. Home, log in, and sign up highlight nothing.
 *
 * Keep the prefixes aligned with `academyNav` and `skillTreeNav`.
 * `/teacher` is its own item, including `/teacher/events`.
 */
const SECTIONS: { key: string; prefix: string }[] = [
  { key: "teacher", prefix: "/teacher" },
  { key: "programs", prefix: "/programs" },
  { key: "skill-tree", prefix: "/skill-tree" },
  { key: "sessions", prefix: "/private-sessions" },
  { key: "events", prefix: "/events" },
  { key: "courses", prefix: "/dashboard" },
  { key: "courses", prefix: "/courses" },
  { key: "courses", prefix: "/bootcamps" },
  { key: "courses", prefix: "/checkout" },
  { key: "courses", prefix: "/headliner" },
];

export function activeNavKey(pathname: string): string | null {
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  for (const section of SECTIONS) {
    if (path === section.prefix || path.startsWith(`${section.prefix}/`)) return section.key;
  }
  return null;
}
