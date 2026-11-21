import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MentorForm } from "@/components/mentor-form";
import { requireStaff } from "@/lib/auth";
import { listMentors, mentorBySlug } from "@/lib/content";
import { roleLabel } from "@/lib/roles";

type MentorRow = NonNullable<Awaited<ReturnType<typeof mentorBySlug>>>;

function EditMentorBody({ mentor, role, error }: { mentor: MentorRow; role: string | null; error: boolean }) {
  return (
    <main className="shell">
      <div className="crumbs">
        <Link href="/teacher">{role ? roleLabel(role) : "Dashboard"}</Link> › <b>{mentor.name}</b>
      </div>
      <h1 className="page-title" style={{ marginBottom: 12 }}>{mentor.name}</h1>
      {error ? <div className="error">Name, role line, and bio are required. Photo URL, if you add one, starts with http.</div> : null}
      <MentorForm mentor={mentor} />
    </main>
  );
}

async function EditMentorLive({ mentor, searchParams }: { mentor: MentorRow; searchParams: Promise<{ error?: string }> }) {
  const [staff, query] = await Promise.all([requireStaff(), searchParams]);
  return <EditMentorBody mentor={mentor} role={staff.role} error={Boolean(query.error)} />;
}

export async function generateStaticParams() {
  const mentors = await listMentors();
  return mentors.length > 0 ? mentors.map((mentor) => ({ slug: mentor.slug })) : [{ slug: "_" }];
}

export default async function EditMentorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const mentor = await mentorBySlug(slug);
  if (!mentor) notFound();
  return (
    <Suspense fallback={<EditMentorBody mentor={mentor} role={null} error={false} />}>
      <EditMentorLive mentor={mentor} searchParams={searchParams} />
    </Suspense>
  );
}
