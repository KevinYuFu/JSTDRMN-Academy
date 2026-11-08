import { AppHeader } from "@/components/app-header";
import { SessionsBoard } from "@/components/sessions-editor";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { unpackMentorList } from "@/lib/mentors";
import { pageCopyKeys, readPageCopy } from "@/lib/page-copy";
import { canEditPrograms } from "@/lib/program-edit";

export const dynamic = "force-dynamic";

export default async function PrivateSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string; mentor?: string }>;
}) {
  const query = await searchParams;
  const [mentors, course, user, storedCopy] = await Promise.all([
    prisma.mentor.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
    prisma.course.findFirst({ where: { billing: "request" } }),
    getUser(),
    prisma.meta.findUnique({ where: { key: pageCopyKeys.sessions } }),
  ]);
  const copy = readPageCopy("sessions", storedCopy?.value);

  return (
    <>
      <AppHeader active="sessions" />
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
