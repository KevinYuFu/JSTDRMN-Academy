import Link from "next/link";
import { setMentorActive } from "@/app/actions";
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
  const [courses, comments, students, logs, cohorts, requests, mentors] = await Promise.all([
    prisma.course.findMany({
      where: { access: { not: "request" } },
      orderBy: { sort: "asc" },
      include: { lessons: true, cohorts: { orderBy: { sort: "asc" } } },
    }),
    prisma.comment.findMany({
      where: { parentId: null },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: true, lesson: { include: { course: true, cohort: true } }, replies: { include: { user: true } } },
    }),
    prisma.user.findMany({
      where: { role: "student" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, discordId: true, discordUsername: true },
    }),
    prisma.hubspotLog.findMany({ orderBy: { createdAt: "desc" }, take: 4 }),
    prisma.cohort.findMany({ include: { course: true }, orderBy: { sort: "asc" } }),
    prisma.sessionRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { course: true, mentor: true },
    }),
    prisma.mentor.findMany({ orderBy: { sort: "asc" } }),
  ]);
  const waiting = comments.filter((comment) => !comment.replies.some((reply) => isStaff(reply.user.role))).length;

  return (
    <>
      <AppHeader active="teacher" />
      <main className="shell">
        <h1 className="page-title" style={{ marginBottom: 6 }}>Academy lead</h1>
        <p className="note" style={{ marginBottom: 12 }}>{teacher.name}, this is the management view: students, Discord links, events, announcements, session requests, and mentors.</p>
        <div className="detail-actions" style={{ marginBottom: 16 }}>
          <Link className="pill pill-purple" href="/teacher/events">Events</Link>
          <Link className="pill pill-purple" href="/teacher/announcements">Announcements</Link>
          <Link className="pill pill-black" href="/teacher/access">Grant or revoke</Link>
        </div>
        <div className="stat-row">
          <div className="stat"><b>{students.length}</b><span>Students</span></div>
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
            <h2 className="section-label" style={{ marginTop: 18 }}>Mentors</h2>
            <p className="note">Private Sessions reads this list. Hide takes a mentor off the public page.</p>
            {mentors.map((mentor) => (
              <div key={mentor.id} className="list-row">
                <div>
                  <b>{mentor.name}</b>
                  <div className="note">
                    {mentor.roleLine}
                    {mentor.placeholder ? " · Placeholder" : ""}
                    {mentor.active ? "" : " · Hidden"}
                  </div>
                </div>
                <div className="detail-actions">
                  <Link className="pill pill-black" href={`/teacher/mentors/${mentor.slug}`}>Edit</Link>
                  <form action={setMentorActive}>
                    <input type="hidden" name="id" value={mentor.id} />
                    <input type="hidden" name="active" value={mentor.active ? "false" : "true"} />
                    <button className="pill pill-black" type="submit">{mentor.active ? "Hide" : "Show"}</button>
                  </form>
                </div>
              </div>
            ))}
            <p style={{ margin: "14px 0" }}>
              <Link className="pill pill-purple" href="/teacher/mentors/new">Add mentor</Link>
            </p>
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
            <h2 className="section-label">Students</h2>
            {students.map((student) => (
              <div key={student.id} className="list-row">
                <div>
                  <b>{student.name}</b>
                  <div className="note">{student.email}</div>
                </div>
                <span className="note">{student.discordId ? `Discord ${student.discordUsername ?? "linked"}` : "Discord not linked"}</span>
              </div>
            ))}
            <h2 className="section-label" style={{ marginTop: 18 }}>Private session requests</h2>
            {requests.length === 0 ? <p className="note">No session requests yet.</p> : null}
            {requests.map((request) => (
              <article key={request.id} className="thread">
                <div className="who">
                  <b>{request.name}</b>
                  <span> · {when(request.createdAt)} · {request.mentor?.name ?? "Mentor"}</span>
                </div>
                <p>{request.topic}</p>
                <p className="note">{request.email} · {request.preferredTimes}</p>
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
