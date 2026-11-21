import { Suspense } from "react";
import Link from "next/link";
import { grantAccess, revokeAccess } from "@/app/actions";
import { Form } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireStaff } from "@/lib/auth";
import { listCourses, loadCohortsWithCourses } from "@/lib/content";
import { prisma } from "@/lib/db";
import { roleLabel } from "@/lib/roles";

type CourseRow = Awaited<ReturnType<typeof listCourses>>[number];
type CohortRow = Awaited<ReturnType<typeof loadCohortsWithCourses>>[number];

function targetsFor(courses: CourseRow[], cohorts: CohortRow[]) {
  return [
    ...courses.filter((course) => course.access === "headliner").map((course) => ({ value: "headliner", label: `${course.title} membership` })),
    ...courses
      .filter((course) => course.access === "purchase" || course.access === "subscription")
      .map((course) => ({ value: `program:${course.id}`, label: course.title })),
    ...cohorts.map((cohort) => ({ value: `cohort:${cohort.id}:${cohort.courseId}`, label: `${cohort.course.title} · ${cohort.name}` })),
  ];
}

function AccessBody({
  courses,
  cohorts,
  role,
  banner,
  error,
  students,
  entitlements,
  pending,
}: {
  courses: CourseRow[];
  cohorts: CohortRow[];
  role: string | null;
  banner: string | null;
  error: boolean;
  students: { id: string; name: string; email: string }[] | null;
  entitlements: {
    id: string;
    product: string;
    source: string;
    user: { name: string; email: string };
    course: { title: string } | null;
    cohort: { name: string } | null;
  }[] | null;
  pending: { id: string; email: string; product: string; source: string }[] | null;
}) {
  const targets = targetsFor(courses, cohorts);
  return (
    <main className="shell">
      <div className="crumbs">
        <Link href="/teacher">{role ? roleLabel(role) : "Dashboard"}</Link> › <b>Access</b>
      </div>
      <h1 className="page-title" style={{ marginBottom: 8 }}>Grant or revoke</h1>
      <p className="note" style={{ marginBottom: 16, maxWidth: 640 }}>
        Bootcamp students arrive from HubSpot. Put their email here when they’re accepted, or let the webhook do it once a token is set.
      </p>
      {banner ? <div className="banner">{banner}</div> : null}
      {error ? <div className="error">Need a valid email and a product.</div> : null}
      <Form action={grantAccess} className="card stack" style={{ padding: 18, maxWidth: 560, marginBottom: 22 }}>
        <Label htmlFor="email">Student email</Label>
        <Input id="email" name="email" type="email" list="students" required placeholder="student@email.com" />
        <datalist id="students">
          {students?.map((student) => (
            <option key={student.id} value={student.email}>{student.name}</option>
          ))}
        </datalist>
        <Label htmlFor="target">What they should open</Label>
        <select id="target" name="target" className="h-11 rounded-[25px] border border-white/15 bg-[#121212] px-4" required defaultValue={targets[0]?.value}>
          {targets.map((target) => (
            <option key={target.value} value={target.value}>{target.label}</option>
          ))}
        </select>
        <Button type="submit" className="self-start">Grant access</Button>
      </Form>
      {entitlements && pending ? (
        <section className="card" style={{ padding: "8px 16px 16px" }}>
          <h2 className="section-label">Active access</h2>
          {entitlements.length === 0 ? <p className="note">Nobody has a seat yet.</p> : null}
          {entitlements.map((row) => (
            <div key={row.id} className="list-row">
              <div>
                <b>{row.user.name}</b>
                <div className="note">
                  {row.user.email} · {row.product}
                  {row.course ? ` · ${row.course.title}` : ""}
                  {row.cohort ? ` · ${row.cohort.name}` : ""} · {row.source}
                </div>
              </div>
              <Dialog>
                <DialogTrigger className="pill pill-black">Revoke</DialogTrigger>
                <DialogContent>
                  <DialogTitle>Revoke this seat?</DialogTitle>
                  <DialogDescription>
                    {row.user.name} will lose {row.cohort?.name || row.course?.title || row.product}. You can grant it again later.
                  </DialogDescription>
                  <form action={revokeAccess} style={{ marginTop: 16 }}>
                    <input type="hidden" name="id" value={row.id} />
                    <Button type="submit">Revoke access</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          ))}
          <h2 className="section-label" style={{ marginTop: 12 }}>Waiting on signup</h2>
          {pending.length === 0 ? <p className="note">No pending emails.</p> : null}
          {pending.map((row) => (
            <div key={row.id} className="list-row">
              <div>
                <b>{row.email}</b>
                <div className="note">{row.product} · {row.source}</div>
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </main>
  );
}

async function AccessLive({
  courses,
  cohorts,
  searchParams,
}: {
  courses: CourseRow[];
  cohorts: CohortRow[];
  searchParams: Promise<{ granted?: string; revoked?: string; pending?: string; error?: string }>;
}) {
  const [staff, query] = await Promise.all([requireStaff(), searchParams]);
  const [entitlements, pending, students] = await Promise.all([
    prisma.entitlement.findMany({
      where: { status: "active" },
      include: { user: true, course: true, cohort: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pendingGrant.findMany({ where: { consumedAt: null }, orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({ where: { role: "student" }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true } }),
  ]);
  const banner = query.granted ? "Access granted." : query.pending ? "No account yet. The seat waits until they sign up with that email." : query.revoked ? "Access revoked." : null;
  return (
    <AccessBody
      courses={courses}
      cohorts={cohorts}
      role={staff.role}
      banner={banner}
      error={Boolean(query.error)}
      students={students}
      entitlements={entitlements}
      pending={pending}
    />
  );
}

export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{ granted?: string; revoked?: string; pending?: string; error?: string }>;
}) {
  const [courses, cohorts] = await Promise.all([listCourses(), loadCohortsWithCourses()]);
  return (
    <Suspense
      fallback={<AccessBody courses={courses} cohorts={cohorts} role={null} banner={null} error={false} students={null} entitlements={null} pending={null} />}
    >
      <AccessLive courses={courses} cohorts={cohorts} searchParams={searchParams} />
    </Suspense>
  );
}
