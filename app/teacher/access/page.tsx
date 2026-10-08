import Link from "next/link";
import { grantAccess, revokeAccess } from "@/app/actions";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ granted?: string; revoked?: string; pending?: string; error?: string }> }) {
  await requireStaff();
  const query = await searchParams;
  const [courses, cohorts, entitlements, pending, students] = await Promise.all([
    prisma.course.findMany({ orderBy: { sort: "asc" } }),
    prisma.cohort.findMany({ include: { course: true }, orderBy: { sort: "asc" } }),
    prisma.entitlement.findMany({
      where: { status: "active" },
      include: { user: true, course: true, cohort: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pendingGrant.findMany({ where: { consumedAt: null }, orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({ where: { role: "student" }, orderBy: { name: "asc" } }),
  ]);
  const targets = [
    ...courses.filter((course) => course.access === "headliner").map((course) => ({ value: "headliner", label: `${course.title} membership` })),
    ...courses.filter((course) => course.access === "purchase").map((course) => ({ value: `course:${course.id}`, label: course.title })),
    ...courses.filter((course) => course.access === "ash_subscription").map((course) => ({ value: `ash:${course.id}`, label: course.title })),
    ...cohorts.map((cohort) => ({ value: `cohort:${cohort.id}:${cohort.courseId}`, label: `${cohort.course.title} · ${cohort.name}` })),
  ];
  const banner = query.granted ? "Access granted." : query.pending ? "No account yet. The seat waits until they sign up with that email." : query.revoked ? "Access revoked." : null;

  return (
    <>
      <AppHeader active="teacher" />
      <main className="shell">
        <div className="crumbs">
          <Link href="/teacher">Teacher</Link> › <b>Access</b>
        </div>
        <h1 className="page-title" style={{ marginBottom: 8 }}>Grant or revoke</h1>
        <p className="note" style={{ marginBottom: 16, maxWidth: 640 }}>
          Bootcamp students arrive from HubSpot. Put their email here when they’re accepted, or let the webhook do it once a token is set.
        </p>
        {banner ? <div className="banner">{banner}</div> : null}
        {query.error ? <div className="error">Need a valid email and a product.</div> : null}
        <form action={grantAccess} className="card stack" style={{ padding: 18, maxWidth: 560, marginBottom: 22 }}>
          <Label htmlFor="email">Student email</Label>
          <Input id="email" name="email" type="email" list="students" required placeholder="student@email.com" />
          <datalist id="students">
            {students.map((student) => (
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
        </form>
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
      </main>
    </>
  );
}
