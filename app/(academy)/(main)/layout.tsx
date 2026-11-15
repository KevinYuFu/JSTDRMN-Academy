import { AppHeader } from "@/components/app-header";

/** Shared header for the academy pages. It stays mounted across client navigations. */
export default function AcademyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      {children}
    </>
  );
}
