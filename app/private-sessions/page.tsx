import { AppHeader } from "@/components/app-header";
import { MentorRoster } from "@/components/mentor-roster";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { unpackMentorList } from "@/lib/mentors";

export const dynamic = "force-dynamic";

export default async function PrivateSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string; mentor?: string }>;
}) {
  const query = await searchParams;
  const [mentors, course, user] = await Promise.all([
    prisma.mentor.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
    prisma.course.findFirst({ where: { billing: "request" } }),
    getUser(),
  ]);

  return (
    <>
      <AppHeader active="sessions" />
      <main className="sessions-page">
        <section className="sessions-hero">
          <h1>Private Sessions</h1>
          <p>1-on-1 mentorship. Your music, your goals, a mentor in your corner.</p>
        </section>
        {query.sent ? <div className="banner shell-note">Request received. The Academy lead can see it. Nothing is booked yet.</div> : null}
        {query.error ? <div className="error shell-note">Name, email, topic, and preferred times are all required.</div> : null}
        <MentorRoster
          courseId={course?.id ?? ""}
          viewer={user ? { name: user.name, email: user.email } : null}
          openSlug={query.mentor ?? null}
          openForm={query.error === "1" && Boolean(query.mentor)}
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
          }))}
        />
      </main>
    </>
  );
}
