import { isStaff } from "./entitlements";

export type AcademyNavItem = {
  key: string;
  label: string;
  href: string;
};

/** The academy’s own menu. Another item is another entry here. */
export function academyNav(role: string | null): AcademyNavItem[] {
  const staff = role ? isStaff(role) : false;
  return [
    { key: staff ? "teacher" : "dashboard", label: "Dashboard", href: staff ? "/teacher" : "/dashboard" },
    { key: "courses", label: "My Courses", href: "/dashboard" },
  ];
}
