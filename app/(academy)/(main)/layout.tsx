import { AppHeader } from "@/components/app-header";

export const instant = false;

/** Shared header for the academy pages. It stays mounted across client navigations. */
export default function AcademyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      {children}
    </>
  );
}
