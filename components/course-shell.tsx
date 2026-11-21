import Link from "next/link";

/** Shared course chrome. Progress, locks, and the player stream in later. */
export function CourseShell({ title }: { title: string }) {
  return (
    <main className="shell">
      <div className="crumbs">
        <Link href="/dashboard">My Courses</Link> › <b>{title}</b>
      </div>
      <h1 className="page-title">{title}</h1>
    </main>
  );
}
