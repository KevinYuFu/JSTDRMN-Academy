import { Suspense } from "react";
import { SessionsBoard } from "@/components/sessions-editor";
import { getUser } from "@/lib/auth";
import { listActiveMentors, listCourses, loadPageCopy } from "@/lib/content";
import { unpackMentorList } from "@/lib/mentors";
import type { PageCopy } from "@/lib/page-copy";
import { canEditPrograms } from "@/lib/program-edit";
import type { MentorView } from "@/components/mentor-roster";

function mentorViews(mentors: Awaited<ReturnType<typeof listActiveMentors>>): MentorView[] {
  return mentors.map((mentor) => ({
    id: mentor.id,
    slug: mentor.slug,
    name: mentor.name,
    roleLine: mentor.roleLine,
    photoUrl: mentor.photoUrl,
    bio: mentor.bio,
    background: unpackMentorList(mentor.background),
    specialties: unpackMentorList(mentor.specialties),
    genres: unpackMentorList(mentor.genres),
    placeholder: mentor.placeholder,
    rateLabel: mentor.rateLabel,
    instagramUrl: mentor.instagramUrl,
    instagramLabel: mentor.instagramLabel,
  }));
}

async function SessionsLive({
  copy,
  courseId,
  mentors,
  searchParams,
}: {
  copy: PageCopy;
  courseId: string;
  mentors: MentorView[];
  searchParams: Promise<{ sent?: string; error?: string; mentor?: string }>;
}) {
  const [user, query] = await Promise.all([getUser(), searchParams]);
  return (
    <SessionsBoard
      lead={canEditPrograms(user?.role)}
      copy={copy}
      courseId={courseId}
      viewer={user ? { name: user.name, email: user.email } : null}
      openSlug={query.mentor ?? null}
      openForm={query.error === "1" && Boolean(query.mentor)}
      sent={Boolean(query.sent)}
      error={Boolean(query.error)}
      mentors={mentors}
    />
  );
}

export default async function PrivateSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string; mentor?: string }>;
}) {
  const [mentors, courses, copy] = await Promise.all([listActiveMentors(), listCourses(), loadPageCopy("sessions")]);
  const courseId = courses.find((item) => item.billing === "request")?.id ?? "";
  const roster = mentorViews(mentors);
  const guest = (
    <SessionsBoard
      lead={false}
      copy={copy}
      courseId={courseId}
      viewer={null}
      openSlug={null}
      openForm={false}
      sent={false}
      error={false}
      mentors={roster}
    />
  );

  return (
    <Suspense fallback={guest}>
      <SessionsLive copy={copy} courseId={courseId} mentors={roster} searchParams={searchParams} />
    </Suspense>
  );
}
