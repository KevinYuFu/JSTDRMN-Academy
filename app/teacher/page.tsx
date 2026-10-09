import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isStaff } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

function when(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function TeacherPage() {
  const teacher = await requireStaff();
  const [courses, comments, students, logs, cohorts, submissions] = await Promise.all([
    prisma.course.findMany({
      orderBy: { sort: "asc" },
      include: { lessons: true, cohorts: { orderBy: { sort: "asc" } } },
    }),
    prisma.comment.findMany({
      where: { parentId: null },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: true, lesson: { include: { course: true, cohort: true } }, replies: { include: { user: true } } },
    }),
    prisma.user.count({ where: { role: "student" } }),
    prisma.hubspotLog.findMany({ orderBy: { createdAt: "desc" }, take: 4 }),
    prisma.cohort.findMany({ include: { course: true }, orderBy: { sort: "asc" } }),
    prisma.submission.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: true, comments: true },
    }),
  ]);
  const waiting = comments.filter((comment) => !comment.replies.some((reply) => isStaff(reply.user.role))).length;

  return (
    <>
      <AppHeader active="teacher" />
      <main className="shell">
        <h1 className="page-title" style={{ marginBottom: 6 }}>Teacher desk</h1>
        <p className="note" style={{ marginBottom: 16 }}>{teacher.name}, every course and every past cohort is open on this account.</p>
        <div className="stat-row">
          <div className="stat"><b>{students}</b><span>Students</span></div>
          <div className="stat"><b>{courses.length}</b><span>Courses</span></div>
          <div className="stat"><b>{cohorts.length}</b><span>Bootcamp cohorts</span></div>
          <div className="stat"><b>{waiting}</b><span>Notes waiting</span></div>
        </div>
        <div className="split">
          <section className="card" style={{ padding: "8px 16px 12px" }}>
            <h2 className="section-label">All courses</h2>
            {courses.map((course) => (
              <div key={course.id} className="list-row">
                <div>
                  <b>{course.title}</b>
                  <div className="note">
                    {course.lessons.length} lessons
                    {course.cohorts.length ? ` · ${course.cohorts.map((cohort) => cohort.name).join(", ")}` : ""}
                  </div>
                </div>
                <Link className="pill pill-black" href={`/teacher/courses/${course.slug}`}>Edit</Link>
              </div>
            ))}
            <h2 className="section-label" style={{ marginTop: 18 }}>Cohorts</h2>
            {cohorts.map((cohort) => (
              <div key={cohort.id} className="list-row">
                <div>
                  <b>{cohort.course.title} · {cohort.name}</b>
                  <div className="note">{cohort.startsLabel}</div>
                </div>
                <Link className="pill pill-purple" href={`/bootcamps/${cohort.course.slug}/${cohort.slug}`}>Open</Link>
              </div>
            ))}
            <p style={{ margin: "14px 0" }}>
              <Link className="pill pill-purple" href="/teacher/access">Grant or revoke access</Link>
            </p>
          </section>
          <section className="card" style={{ padding: "8px 16px 16px" }}>
            <h2 className="section-label">Recent comments</h2>
            {comments.length === 0 ? <p className="note">No student notes yet.</p> : null}
            {comments.map((comment) => {
              const lesson = comment.lesson;
              const href = lesson.cohort
                ? `/bootcamps/${lesson.course.slug}/${lesson.cohort.slug}?lesson=${lesson.id}#comments`
                : `/courses/${lesson.course.slug}?lesson=${lesson.id}#comments`;
              const answered = comment.replies.some((reply) => isStaff(reply.user.role));
              return (
                <article key={comment.id} className="thread">
                  <div className="who">
                    <b>{comment.user.name}</b>
                    <span> · {when(comment.createdAt)} · {lesson.course.title}</span>
                  </div>
                  <p>{comment.body}</p>
                  <div className="note" style={{ marginTop: 4 }}>{answered ? "Answered" : "Waiting on you"} · {lesson.title}</div>
                  <Link href={href} className="pill pill-black" style={{ marginTop: 8 }}>Reply</Link>
                </article>
              );
            })}
            <h2 className="section-label" style={{ marginTop: 18 }}>Headliner submissions</h2>
            {submissions.length === 0 ? <p className="note">No mixes or tracks in the feedback space yet.</p> : null}
            {submissions.map((submission) => (
              <article key={submission.id} className="thread">
                <div className="who">
                  <b>{submission.title}</b>
                  <span> · {submission.user.name} · {when(submission.createdAt)}</span>
                </div>
                <p className="note">{submission.kind} · {submission.comments.length} comment{submission.comments.length === 1 ? "" : "s"}</p>
                <Link href="/headliner/feedback" className="pill pill-black" style={{ marginTop: 8 }}>Open</Link>
              </article>
            ))}
            <h2 className="section-label" style={{ marginTop: 18 }}>HubSpot log</h2>
            {logs.length === 0 ? (
              <p className="note">No syncs yet. Signups and purchases record a contact when HUBSPOT_PRIVATE_APP_TOKEN is set. Without it, the integration stays quiet.</p>
            ) : (
              logs.map((log) => (
                <p key={log.id} className="note" style={{ marginTop: 8 }}>
                  {log.action} · {when(log.createdAt)}
                </p>
              ))
            )}
          </section>
        </div>
      </main>
    </>
  );
}
