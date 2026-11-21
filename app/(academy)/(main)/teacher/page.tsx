import { Suspense } from "react";
import Link from "next/link";
import { setMentorActive } from "@/app/actions";
import { DashboardShell, type DashboardTab } from "@/components/dashboard/dashboard-shell";
import { PeopleTable } from "@/components/dashboard/people-table";
import styles from "@/components/dashboard/dashboard.module.css";
import { requireStaff } from "@/lib/auth";
import { loadCohortsWithCourses, loadCourseCatalog, listMentors } from "@/lib/content";
import { coursePageHref, dashboardRoleLabel } from "@/lib/dashboard-people";
import { prisma } from "@/lib/db";
import { isStaff } from "@/lib/entitlements";
import { canonicalRole, isLeadActor, roleLabel } from "@/lib/promote";

function when(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const roleErrors: Record<string, string> = {
  forbidden: "Only a Lead can change roles.",
  self: "You can't change your own role.",
  last_lead: "Keep at least one Lead.",
  same: "They already have that role.",
  invalid: "Pick Student, Mentor, Instructor, or Lead.",
  missing: "That person is not in the academy.",
};

const nameErrors: Record<string, string> = {
  forbidden: "Only a Lead can save a name.",
  invalid: "Use a name of 2 to 80 characters.",
  missing: "That person is not in the academy.",
};

function tabFrom(value: string | undefined): DashboardTab {
  if (value === "people" || value === "events" || value === "content") return value;
  return "content";
}

type Catalog = Awaited<ReturnType<typeof loadCourseCatalog>>;
type CohortRow = Awaited<ReturnType<typeof loadCohortsWithCourses>>[number];
type MentorRow = Awaited<ReturnType<typeof listMentors>>[number];

function ProgramsTable({ courses }: { courses: Catalog }) {
  return (
    <section>
      <h2 className="section-label">Programs</h2>
      <p className="note">Overview only. Lessons are added on the lesson page. Program text is edited on the program page.</p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Access</th>
              <th>Delivery</th>
              <th>Lessons</th>
              <th>Links</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id}>
                <td data-label="Title"><span className={styles.value}>{course.title}</span></td>
                <td data-label="Status"><span className={styles.value}>{course.statusLabel}</span></td>
                <td data-label="Access"><span className={styles.value}>{course.access}</span></td>
                <td data-label="Delivery"><span className={styles.value}>{course.delivery || "—"}</span></td>
                <td data-label="Lessons"><span className={styles.value}>{course.lessons.length}</span></td>
                <td className={styles.links} data-label="Links">
                  <Link className="pill pill-black" href={`/teacher/courses/${course.slug}`}>Lessons</Link>
                  <Link className="pill pill-purple" href={coursePageHref(course)}>Page</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CohortsTable({ cohorts }: { cohorts: CohortRow[] }) {
  return (
    <section>
      <h2 className="section-label">Cohorts</h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Program</th>
              <th>Cohort</th>
              <th>When</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cohorts.map((cohort) => (
              <tr key={cohort.id}>
                <td data-label="Program"><span className={styles.value}>{cohort.course.title}</span></td>
                <td data-label="Cohort"><span className={styles.value}>{cohort.name}</span></td>
                <td data-label="When"><span className={styles.value}>{cohort.startsLabel}</span></td>
                <td className={styles.links} data-label="Portal">
                  <Link className="pill pill-purple" href={`/bootcamps/${cohort.course.slug}/${cohort.slug}`}>Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MentorSection({ mentors }: { mentors: MentorRow[] }) {
  return (
    <section className="card" style={{ padding: "8px 16px 12px" }}>
      <h2 className="section-label">Mentor cards</h2>
      <p className="note">Private Sessions reads this list. Hide and edit stay on the existing mentor pages.</p>
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
    </section>
  );
}

function TeacherFrame({
  courses,
  cohorts,
  mentors,
  staff,
  initial,
  banners,
  comments,
  people,
  requests,
  logs,
}: {
  courses: Catalog;
  cohorts: CohortRow[];
  mentors: MentorRow[];
  staff: { id: string; name: string; role: string } | null;
  initial: DashboardTab;
  banners: React.ReactNode;
  comments: React.ReactNode;
  people: React.ReactNode;
  requests: React.ReactNode;
  logs: React.ReactNode;
}) {
  const lead = staff ? isLeadActor(staff.role) : false;
  return (
    <main className="shell">
      <h1 className="page-title" style={{ marginBottom: 6 }}>{staff ? roleLabel(staff.role) : "Dashboard"}</h1>
      <p className="note" style={{ marginBottom: 12 }}>
        {staff
          ? lead
            ? `${staff.name}, this dashboard lists the academy. Editing a program or the skill tree stays on those pages. You can rename someone and change roles. You cannot change your own role.`
            : `${staff.name}, this dashboard lists the academy. Editing a program or the skill tree stays on those pages. Only a Lead can rename someone or change roles.`
          : "This dashboard lists the academy. Editing a program or the skill tree stays on those pages."}
      </p>
      {banners}
      <DashboardShell
        initial={initial}
        content={
          <>
            <ProgramsTable courses={courses} />
            <CohortsTable cohorts={cohorts} />
            {lead ? <p><Link className="pill pill-purple" href="/teacher/skill-tree">Skill tree</Link></p> : <p className="note">The skill tree editor is on its own page and is limited to a Lead.</p>}
            {comments}
          </>
        }
        people={
          <>
            {people}
            <p><Link className="pill pill-purple" href="/teacher/access">Grant or revoke access</Link></p>
            <MentorSection mentors={mentors} />
            {requests}
          </>
        }
        events={
          <>
            <section>
              <h2 className="section-label">Events and announcements</h2>
              <p className="note">Schedules and the announcement queue stay on their own pages. Nothing here connects a new provider.</p>
              <div className={styles.links}>
                <Link className="pill pill-purple" href="/teacher/events">Events</Link>
                <Link className="pill pill-purple" href="/teacher/announcements">Announcements</Link>
              </div>
            </section>
            {logs}
          </>
        }
      />
    </main>
  );
}

async function TeacherLive({
  courses,
  cohorts,
  mentors,
  searchParams,
}: {
  courses: Catalog;
  cohorts: CohortRow[];
  mentors: MentorRow[];
  searchParams: Promise<{ saved?: string; roleError?: string; skillTree?: string; tab?: string; nameError?: string }>;
}) {
  const staff = await requireStaff();
  const query = await searchParams;
  const lead = isLeadActor(staff.role);
  const [comments, people, logs, requests] = await Promise.all([
    prisma.comment.findMany({
      where: { parentId: null },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: true, lesson: { include: { course: true, cohort: true } }, replies: { include: { user: true } } },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true, discordId: true, discordUsername: true },
    }),
    prisma.hubspotLog.findMany({ orderBy: { createdAt: "desc" }, take: 4 }),
    prisma.sessionRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { course: true, mentor: true },
    }),
  ]);
  const roleError = query.roleError ? roleErrors[query.roleError] ?? "That role change did not save." : null;
  const nameError = query.nameError ? nameErrors[query.nameError] ?? "That name did not save." : null;
  const initial = query.saved === "role" || query.roleError || query.saved === "name" || query.nameError || query.tab === "people"
    ? "people"
    : tabFrom(query.tab);

  return (
    <TeacherFrame
      courses={courses}
      cohorts={cohorts}
      mentors={mentors}
      staff={staff}
      initial={initial}
      banners={
        <>
          {query.saved === "role" ? <div className="banner">Role saved.</div> : null}
          {query.saved === "name" ? <div className="banner">Name saved.</div> : null}
          {roleError ? <div className="error">{roleError}</div> : null}
          {nameError ? <div className="error">{nameError}</div> : null}
          {query.skillTree === "forbidden" ? <div className="error">Only a Lead can edit the skill tree.</div> : null}
        </>
      }
      comments={
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
        </section>
      }
      people={
        <>
          <PeopleTable
            lead={lead}
            actorId={staff.id}
            people={people.map((person) => ({
              id: person.id,
              name: person.name,
              email: person.email,
              role: person.role,
              roleLabel: dashboardRoleLabel(person.role),
              discord: person.discordId ? `Linked${person.discordUsername ? ` as ${person.discordUsername}` : ""}` : "Not linked",
            }))}
          />
          <p className="note">{people.filter((person) => canonicalRole(person.role) === "student").length} of these accounts are students. The table lists every signup.</p>
        </>
      }
      requests={
        <section className="card" style={{ padding: "8px 16px 16px" }}>
          <h2 className="section-label">Private session requests</h2>
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
        </section>
      }
      logs={
        <section className="card" style={{ padding: "8px 16px 16px" }}>
          <h2 className="section-label">HubSpot log</h2>
          <p className="note">Read-only history. This tab does not add a HubSpot connection.</p>
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
      }
    />
  );
}

export default async function TeacherPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; roleError?: string; skillTree?: string; tab?: string; nameError?: string }>;
}) {
  const [catalog, cohorts, mentors] = await Promise.all([loadCourseCatalog(), loadCohortsWithCourses(), listMentors()]);
  const courses = catalog.filter((course) => course.access !== "request");
  return (
    <Suspense
      fallback={
        <TeacherFrame
          courses={courses}
          cohorts={cohorts}
          mentors={mentors}
          staff={null}
          initial="content"
          banners={null}
          comments={null}
          people={null}
          requests={null}
          logs={null}
        />
      }
    >
      <TeacherLive courses={courses} cohorts={cohorts} mentors={mentors} searchParams={searchParams} />
    </Suspense>
  );
}
