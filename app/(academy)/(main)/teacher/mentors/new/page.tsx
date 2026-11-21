import { Suspense } from "react";
import Link from "next/link";
import { MentorForm } from "@/components/mentor-form";
import { requireStaff } from "@/lib/auth";
import { roleLabel } from "@/lib/roles";

function NewMentorBody({ role, error }: { role: string | null; error: boolean }) {
  return (
    <main className="shell">
      <div className="crumbs">
        <Link href="/teacher">{role ? roleLabel(role) : "Dashboard"}</Link> › <b>New mentor</b>
      </div>
      <h1 className="page-title" style={{ marginBottom: 12 }}>New mentor</h1>
      {error ? <div className="error">Name, role line, and bio are required. Photo URL, if you add one, starts with http.</div> : null}
      <MentorForm mentor={null} />
    </main>
  );
}

async function NewMentorLive({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [staff, query] = await Promise.all([requireStaff(), searchParams]);
  return <NewMentorBody role={staff.role} error={Boolean(query.error)} />;
}

export default async function NewMentorPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <Suspense fallback={<NewMentorBody role={null} error={false} />}>
      <NewMentorLive searchParams={searchParams} />
    </Suspense>
  );
}
