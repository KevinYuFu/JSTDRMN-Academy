import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";
import { formatCad, prices } from "@/lib/config";
import { prisma } from "@/lib/db";
import { containerAccess, isStaff, type CourseAccess } from "@/lib/entitlements";
import { entitlementRecords } from "@/lib/learn";

export const dynamic = "force-dynamic";

function asAccess(value: string): CourseAccess {
  if (value === "headliner" || value === "purchase" || value === "ash_subscription" || value === "cohort") return value;
  return "purchase";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [courses, records, progress] = await Promise.all([
    prisma.course.findMany({
      orderBy: { sort: "asc" },
      include: { cohorts: { orderBy: { sort: "asc" } }, lessons: true },
    }),
    entitlementRecords(user.id),
    prisma.progress.findMany({ where: { userId: user.id } }),
  ]);
  const done = new Set(progress.filter((item) => item.status === "completed").map((item) => item.lessonId));

  type Card = {
    key: string;
    title: string;
    kicker: string;
    body: string;
    href: string;
    allowed: boolean;
    panel: string;
    meta: string;
  };

  const cards: Card[] = [];
  for (const course of courses) {
    if (course.access !== "cohort") {
      const decision = containerAccess({
        role: user.role,
        access: asAccess(course.access),
        courseId: course.id,
        cohortId: null,
        entitlements: records,
      });
      const relevant = course.lessons.filter((lesson) => course.access !== "headliner" || lesson.headliner || isStaff(user.role));
      const completed = relevant.filter((lesson) => done.has(lesson.id)).length;
      const price =
        course.access === "headliner"
          ? formatCad(prices.headlinerMonthlyCents, "month")
          : course.access === "ash_subscription"
            ? formatCad(prices.ashMonthlyCents, "month")
            : formatCad(prices.courseCents);
      cards.push({
        key: course.id,
        title: course.title,
        kicker: course.statusLabel,
        body: course.tagline,
        href: decision.allowed ? `/courses/${course.slug}` : `/courses/${course.slug}`,
        allowed: decision.allowed,
        panel: course.panel,
        meta: decision.allowed ? `${completed} of ${relevant.length} lessons` : price,
      });
      continue;
    }
    if (course.cohorts.length === 0) {
      cards.push({
        key: course.id,
        title: course.title,
        kicker: course.statusLabel,
        body: course.tagline,
        href: `/bootcamps/${course.slug}`,
        allowed: false,
        panel: course.panel,
        meta: "Apply",
      });
      continue;
    }
    for (const cohort of course.cohorts) {
      const decision = containerAccess({
        role: user.role,
        access: "cohort",
        courseId: course.id,
        cohortId: cohort.id,
        entitlements: records,
      });
      const lessons = course.lessons.filter((lesson) => lesson.cohortId === cohort.id);
      const completed = lessons.filter((lesson) => done.has(lesson.id)).length;
      cards.push({
        key: cohort.id,
        title: course.title,
        kicker: `${cohort.name} · ${cohort.startsLabel}`,
        body: course.tagline,
        href: decision.allowed ? `/bootcamps/${course.slug}/${cohort.slug}` : `/bootcamps/${course.slug}`,
        allowed: decision.allowed,
        panel: course.panel,
        meta: decision.allowed ? `${completed} of ${lessons.length} lessons` : "Cohort seat",
      });
    }
  }

  const mine = cards.filter((card) => card.allowed);
  const locked = cards.filter((card) => !card.allowed);

  return (
    <>
      <AppHeader active="courses" />
      <main className="shell">
        <h1 className="page-title" style={{ marginBottom: 6 }}>My Courses</h1>
        <p className="note" style={{ marginBottom: 18 }}>
          {user.name.split(" ")[0]}, this shelf is only what your account can open.
        </p>
        <h2 className="section-label">Yours</h2>
        {mine.length === 0 ? (
          <div className="card" style={{ padding: 18, marginBottom: 22 }}>
            <p>Nothing unlocked yet. Headliner, a single course, or a bootcamp cohort will show up here after you subscribe, buy, or get accepted.</p>
          </div>
        ) : (
          <div className="shelf" style={{ marginBottom: 28 }}>
            {mine.map((card) => (
              <Link key={card.key} href={card.href} className={`shelf-card panel-${card.panel}`}>
                <div className="kicker">{card.kicker}</div>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
                <p style={{ marginTop: 8 }}>{card.meta}</p>
              </Link>
            ))}
          </div>
        )}
        <h2 className="section-label">Locked</h2>
        <div className="shelf">
          {locked.map((card) => (
            <Link key={card.key} href={card.href} className="shelf-card panel-purple">
              <div className="kicker">{card.kicker}</div>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
              <p style={{ marginTop: 8, color: "#fff2cc" }}>{card.meta} · view upsell</p>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
