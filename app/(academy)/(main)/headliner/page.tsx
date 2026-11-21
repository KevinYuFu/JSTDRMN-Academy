import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DiscordCard } from "@/components/discord-card";
import { ProgressionTree } from "@/components/progression-tree";
import { getUser } from "@/lib/auth";
import { formatCad, prices } from "@/lib/config";
import { lessonsForCourse, listCourses, tracksForCourse } from "@/lib/content";
import { discordCardAccess } from "@/lib/entitlements";
import { entitlementRecords } from "@/lib/learn";
import { flattenTracks, buildTrackTree } from "@/lib/tracks";

type HeadlinerCourse = {
  slug: string;
  title: string;
  statusLabel: string;
  tagline: string;
  lessons: Awaited<ReturnType<typeof lessonsForCourse>>;
  tracks: Awaited<ReturnType<typeof tracksForCourse>>;
};

function HeadlinerBody({
  course,
  discordAllowed,
  subscribeHref,
  unlocked,
  discord,
}: {
  course: HeadlinerCourse;
  discordAllowed: boolean;
  subscribeHref: string;
  unlocked: boolean;
  discord: string | null;
}) {
  const firstLesson = new Map<string, string>();
  for (const lesson of course.lessons) {
    if (lesson.trackId && !firstLesson.has(lesson.trackId)) firstLesson.set(lesson.trackId, lesson.id);
  }
  const ordered = flattenTracks(buildTrackTree(course.tracks));
  return (
    <main className="shell">
      <div className="crumbs">
        <Link href="/programs">Programs</Link> › <b>{course.title}</b>
      </div>
      {unlocked ? <div className="banner">You’re in. Headliner stays open while the subscription is paid.</div> : null}
      {discord === "connected" ? <div className="banner">Discord is connected. The Headliner role follows this subscription.</div> : null}
      {discord === "unconfigured" ? <div className="banner">Discord OAuth isn’t configured yet.</div> : null}
      {discord === "error" ? <div className="error">Discord didn’t connect. Try again once the app credentials are set.</div> : null}
      <div className="titlebar">
        <div>
          <div className="kicker">{course.statusLabel}</div>
          <h1 className="page-title">{course.title}</h1>
          <p className="note" style={{ marginTop: 8, maxWidth: 640 }}>{course.tagline}</p>
        </div>
        <div className="banner-side">
          <div className="amount">{formatCad(prices.headlinerMonthlyCents, "month")} CAD</div>
          {discordAllowed ? null : (
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

      {discordAllowed ? (
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
  );
}

async function HeadlinerLive({
  course,
  searchParams,
}: {
  course: HeadlinerCourse;
  searchParams: Promise<{ unlocked?: string; discord?: string }>;
}) {
  const [user, query] = await Promise.all([getUser(), searchParams]);
  const records = user ? await entitlementRecords(user.id) : [];
  const role = user?.role ?? "student";
  const discord = discordCardAccess({ role, entitlements: records });
  const subscribeHref = user ? "/checkout?product=headliner" : "/signup?next=/checkout?product=headliner";
  const note = query.discord === "connected" || query.discord === "unconfigured" || query.discord === "error" ? query.discord : null;
  return (
    <HeadlinerBody
      course={course}
      discordAllowed={discord.allowed}
      subscribeHref={subscribeHref}
      unlocked={Boolean(query.unlocked)}
      discord={note}
    />
  );
}

export default async function HeadlinerPage({
  searchParams,
}: {
  searchParams: Promise<{ unlocked?: string; discord?: string }>;
}) {
  const headliner = (await listCourses()).find((item) => item.access === "headliner");
  if (!headliner) notFound();
  const [lessons, tracks] = await Promise.all([lessonsForCourse(headliner.id), tracksForCourse(headliner.id)]);
  const course = { slug: headliner.slug, title: headliner.title, statusLabel: headliner.statusLabel, tagline: headliner.tagline, lessons, tracks };
  const guest = (
    <HeadlinerBody
      course={course}
      discordAllowed={false}
      subscribeHref="/signup?next=/checkout?product=headliner"
      unlocked={false}
      discord={null}
    />
  );
  return (
    <Suspense fallback={guest}>
      <HeadlinerLive course={course} searchParams={searchParams} />
    </Suspense>
  );
}
