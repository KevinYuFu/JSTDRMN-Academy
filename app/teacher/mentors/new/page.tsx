import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { MentorForm } from "@/components/mentor-form";
import { requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewMentorPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireStaff();
  const query = await searchParams;
  return (
    <>
      <AppHeader active="teacher" />
      <main className="shell">
        <div className="crumbs">
          <Link href="/teacher">Academy lead</Link> › <b>New mentor</b>
        </div>
        <h1 className="page-title" style={{ marginBottom: 12 }}>New mentor</h1>
        {query.error ? <div className="error">Name, role line, and bio are required. Photo URL, if you add one, starts with http.</div> : null}
        <MentorForm mentor={null} />
      </main>
    </>
  );
}
