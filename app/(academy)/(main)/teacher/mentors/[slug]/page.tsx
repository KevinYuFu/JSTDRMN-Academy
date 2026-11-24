import { notFound } from "next/navigation";
import { MentorForm } from "@/components/mentor-form";
import { StaffCrumb } from "@/components/staff-crumb";
import { listActiveMentors } from "@/lib/content";
import { mentorFormError } from "@/lib/staff-copy";
import { mentorForEdit } from "@/lib/staff-data";
import { withSample } from "@/lib/static-params";

// Known slugs are prerendered here. A missing one is a 404 from the proxy, which a prefetch skips.
export async function generateStaticParams() {
  const mentors = await listActiveMentors();
  return withSample(mentors.map((mentor) => ({ slug: mentor.slug })), { slug: "_" });
}

export default async function EditMentorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const mentor = await mentorForEdit(slug);
  if (!mentor) notFound();
  const query = await searchParams;
  return (
    <>
      <StaffCrumb page={mentor.name} />
      <h1 className="page-title" style={{ marginBottom: 12 }}>{mentor.name}</h1>
      {query.error ? <div className="error">{mentorFormError}</div> : null}
      <MentorForm mentor={mentor} />
    </>
  );
}
