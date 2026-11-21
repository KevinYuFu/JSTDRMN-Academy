import { StaffCrumb } from "@/components/staff-crumb";
import { notFound } from "next/navigation";
import { MentorForm } from "@/components/mentor-form";
import { requireStaff } from "@/lib/auth";
import { listActiveMentors, mentorBySlug } from "@/lib/content";
export const instant = false;

type MentorRow = NonNullable<Awaited<ReturnType<typeof mentorBySlug>>>;

function EditMentorBody({ mentor, role, error }: { mentor: MentorRow; role: string; error: boolean }) {
  return (
    <main className="shell">
      <StaffCrumb role={role} page={mentor.name} />
      <h1 className="page-title" style={{ marginBottom: 12 }}>{mentor.name}</h1>
      {error ? <div className="error">Name, role line, and bio are required. Photo URL, if you add one, starts with http.</div> : null}
      <MentorForm mentor={mentor} />
    </main>
  );
}

async function EditMentorLive({ slug, searchParams }: { slug: string; searchParams: Promise<{ error?: string }> }) {
  const staff = await requireStaff();
  const [mentor, query] = await Promise.all([mentorBySlug(slug), searchParams]);
  if (!mentor) notFound();
  return <EditMentorBody mentor={mentor} role={staff.role} error={Boolean(query.error)} />;
}

export async function generateStaticParams() {
  const mentors = await listActiveMentors();
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
  return await EditMentorLive({ slug, searchParams });
}
