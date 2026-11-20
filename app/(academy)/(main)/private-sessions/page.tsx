import { SessionsBoard } from "@/components/sessions-editor";
import { getUser } from "@/lib/auth";
import { listActiveMentors, listCourses, loadPageCopy } from "@/lib/content";
import { unpackMentorList } from "@/lib/mentors";
import { canEditPrograms } from "@/lib/program-edit";

export const instant = false;

export default async function PrivateSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string; mentor?: string }>;
}) {
  const query = await searchParams;
  const [mentors, courses, user, copy] = await Promise.all([
    listActiveMentors(),
    listCourses(),
    getUser(),
    loadPageCopy("sessions"),
  ]);
  const course = courses.find((item) => item.billing === "request");

  return (
    <>
      <SessionsBoard
          lead={canEditPrograms(user?.role)}
          copy={copy}
          courseId={course?.id ?? ""}
          viewer={user ? { name: user.name, email: user.email } : null}
          openSlug={query.mentor ?? null}
          openForm={query.error === "1" && Boolean(query.mentor)}
          sent={Boolean(query.sent)}
          error={Boolean(query.error)}
          mentors={mentors.map((mentor) => ({
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
          }))}
        />
    </>
  );
}
