import { isStaff } from "./entitlements";
import { skillTreeNav } from "./skill-tree";

export type AcademyNavItem = {
  key: string;
  label: string;
  href: string;
  /** Staff workspace. In the main menu, only for Lead, Instructor, and Mentor. */
  variant?: "staff";
};

/**
 * The academy’s own menu. Another item is another entry here.
 * Students and guests get the same tabs. Staff also get Dashboard, in the
 * menu with the other items. It opens the shared staff view. My Courses
 * stays its own item. The label does not say Lead or Instructor.
 */
export function academyNav(role: string | null): AcademyNavItem[] {
  const items: AcademyNavItem[] = [
    { key: "programs", label: "Programs", href: "/" },
    skillTreeNav,
    { key: "sessions", label: "Private Sessions", href: "/private-sessions" },
    { key: "events", label: "Events", href: "/events" },
  ];
  if (role && isStaff(role)) {
    items.push({ key: "teacher", label: "Dashboard", href: "/teacher", variant: "staff" });
  }
  items.push({ key: "courses", label: "My Courses", href: "/dashboard" });
  return items;
}
