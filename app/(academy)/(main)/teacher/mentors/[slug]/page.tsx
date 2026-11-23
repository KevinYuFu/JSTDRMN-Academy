import { notFound } from "next/navigation";
import { MentorForm } from "@/components/mentor-form";
import { StaffCrumb } from "@/components/staff-crumb";
import { requireStaff } from "@/lib/auth";
import { listActiveMentors, mentorBySlug } from "@/lib/content";

export const instant = false;

// Known slugs are prerendered here. A missing one is a 404 from the proxy, which a prefetch skips.
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
  const staff = await requireStaff();
  const { slug } = await params;
  const query = await searchParams;
  const mentor = await mentorBySlug(slug);
  if (!mentor) notFound();
  return (
    <>
      <main className="shell">
        <StaffCrumb role={staff.role} page={mentor.name} />
        <h1 className="page-title" style={{ marginBottom: 12 }}>{mentor.name}</h1>
        {query.error ? <div className="error">Name, role line, and bio are required. Photo URL, if you add one, starts with http.</div> : null}
        <MentorForm mentor={mentor} />
      </main>
    </>
  );
}
