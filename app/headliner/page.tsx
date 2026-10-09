import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { DiscordCard } from "@/components/discord-card";
import { ProgressionTree } from "@/components/progression-tree";
import { getUser } from "@/lib/auth";
import { formatCad, prices } from "@/lib/config";
import { prisma } from "@/lib/db";
import { discordCardAccess, feedbackAccess } from "@/lib/entitlements";
import { entitlementRecords } from "@/lib/learn";
import { flattenTracks, buildTrackTree } from "@/lib/tracks";

export const dynamic = "force-dynamic";

export default async function HeadlinerPage({
  searchParams,
}: {
  searchParams: Promise<{ unlocked?: string; discord?: string }>;
}) {
  const query = await searchParams;
  const course = await prisma.course.findFirst({
    where: { access: "headliner" },
    orderBy: { sort: "asc" },
    include: {
      tracks: { orderBy: { position: "asc" } },
      lessons: { orderBy: { position: "asc" } },
    },
  });
  if (!course) notFound();
  const user = await getUser();
  const records = user ? await entitlementRecords(user.id) : [];
  const role = user?.role ?? "student";
  const discord = discordCardAccess({ role, entitlements: records });
  const feedback = feedbackAccess({ role, entitlements: records });
  const subscribeHref = user ? "/checkout?product=headliner" : "/signup?next=/checkout?product=headliner";
  const firstLesson = new Map<string, string>();
  for (const lesson of course.lessons) {
    if (lesson.trackId && !firstLesson.has(lesson.trackId)) firstLesson.set(lesson.trackId, lesson.id);
  }
  const ordered = flattenTracks(buildTrackTree(course.tracks));

  return (
    <>
      <AppHeader active="courses" />
      <main className="shell">
        <div className="crumbs">
          <Link href="/">Programs</Link> › <b>{course.title}</b>
        </div>
        {query.unlocked ? <div className="banner">You’re in. Headliner stays open while the subscription is paid.</div> : null}
        {query.discord === "connected" ? <div className="banner">Discord is connected. The Headliner role follows this subscription.</div> : null}
        {query.discord === "unconfigured" ? <div className="banner">Discord OAuth isn’t configured yet.</div> : null}
        {query.discord === "error" ? <div className="error">Discord didn’t connect. Try again once the app credentials are set.</div> : null}
        <div className="titlebar">
          <div>
            <div className="kicker">{course.statusLabel}</div>
            <h1 className="page-title">{course.title}</h1>
            <p className="note" style={{ marginTop: 8, maxWidth: 640 }}>{course.tagline}</p>
          </div>
          <div className="banner-side">
            <div className="amount">{formatCad(prices.headlinerMonthlyCents, "month")} CAD</div>
            {feedback.allowed ? (
              <Link className="pill pill-purple" href="/headliner/feedback">Feedback space</Link>
            ) : (
              <Link className="pill pill-purple" href={subscribeHref}>Subscribe</Link>
            )}
          </div>
        </div>

        <h2 className="section-label">The progression tree</h2>
        <p className="note" style={{ marginBottom: 14, maxWidth: 640 }}>
          Recommended path. Tracks are records, so another branch is another row.
        </p>
        <ProgressionTree
          tracks={course.tracks}
          lessonHref={(trackId) => {
            const lessonId = firstLesson.get(trackId);
            return lessonId ? `/courses/${course.slug}?lesson=${lessonId}` : null;
          }}
        />

        <h2 className="section-label" style={{ marginTop: 28 }}>Lessons</h2>
        <div className="card" style={{ padding: "4px 16px 8px" }}>
          {ordered.map((track) => {
            const lessons = course.lessons.filter((lesson) => lesson.trackId === track.id);
            if (lessons.length === 0) return null;
            return (
              <div key={track.id}>
                {lessons.map((lesson) => (
                  <div key={lesson.id} className="list-row">
                    <div>
                      <b>{lesson.title}</b>
                      <div className="note">{lesson.runtimeLabel} · video placeholder</div>
                    </div>
                    <Link className="pill pill-black" href={`/courses/${course.slug}?lesson=${lesson.id}`}>
                      Open
                    </Link>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {discord.allowed ? (
          <div style={{ marginTop: 22 }}>
            <DiscordCard />
          </div>
        ) : (
          <aside className="discord-card locked" style={{ marginTop: 22 }}>
            <div className="kicker">Headliner</div>
            <h2>Headliner Discord</h2>
            <p>The Headliner chat opens with an active membership. A course or a bootcamp seat does not include it.</p>
            <Link className="pill pill-purple" href={subscribeHref}>Subscribe</Link>
          </aside>
        )}
      </main>
    </>
  );
}
