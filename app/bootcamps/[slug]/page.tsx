import Link from "next/link";
import { redirect } from "next/navigation";
import { addCohort } from "@/app/actions";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getUser } from "@/lib/auth";
import { hubspotApplyUrl } from "@/lib/config";
import { prisma } from "@/lib/db";
import { containerAccess } from "@/lib/entitlements";
import { entitlementRecords } from "@/lib/learn";

export const dynamic = "force-dynamic";

export default async function BootcampPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; added?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const course = await prisma.course.findUnique({
    where: { slug },
    include: { cohorts: { orderBy: { sort: "asc" } } },
  });
  if (!course || course.access !== "cohort") redirect("/dashboard");
  const user = await getUser();
  const records = user ? await entitlementRecords(user.id) : [];
  const role = user?.role ?? "student";
  const applyHref = hubspotApplyUrl(course.hubspotUrl);
  const open = course.cohorts.filter(
    (cohort) =>
      containerAccess({
        role,
        access: "cohort",
        courseId: course.id,
        cohortId: cohort.id,
        entitlements: records,
      }).allowed,
  );
  if (open.length === 1 && user && role === "student") {
    redirect(`/bootcamps/${course.slug}/${open[0].slug}`);
  }

  return (
    <>
      <AppHeader active="courses" />
      <main className="shell">
        <div className="crumbs">
          <Link href="/dashboard">My Courses</Link> › <b>{course.title}</b>
        </div>
        <h1 className="page-title" style={{ marginBottom: 8 }}>{course.title}</h1>
        <p className="note" style={{ maxWidth: 640, marginBottom: 18 }}>{course.description}</p>
        {query.added ? <div className="banner">Cohort added. Put lessons on it from the teacher course page.</div> : null}
        {query.error ? <div className="error">Check the cohort name and slug. Slugs have to be unique.</div> : null}
        <div className="shelf">
          {course.cohorts.map((cohort) => {
            const allowed = open.some((item) => item.id === cohort.id);
            return (
              <Link key={cohort.id} href={allowed ? `/bootcamps/${course.slug}/${cohort.slug}` : applyHref} className={`shelf-card panel-${course.panel}`}>
                <div className="kicker">{allowed ? "Your portal" : course.statusLabel}</div>
                <h3>{cohort.name}</h3>
                <p>{cohort.startsLabel}</p>
                <p style={{ marginTop: 8, color: "#fff2cc" }}>{allowed ? "Open lessons" : "Apply for a seat"}</p>
              </Link>
            );
          })}
          {course.cohorts.length === 0 ? (
            <a className={`shelf-card panel-${course.panel}`} href={applyHref} target="_blank" rel="noreferrer">
              <div className="kicker">{course.statusLabel}</div>
              <h3>{course.title}</h3>
              <p>No cohort portal is open yet. Applications stay on the JSTDRMN site.</p>
            </a>
          ) : null}
        </div>
        {!open.length ? (
          <p style={{ marginTop: 18 }}>
            <a className="pill pill-purple" href={applyHref} target="_blank" rel="noreferrer">Apply</a>
          </p>
        ) : null}
        {user && (user.role === "teacher" || user.role === "admin") ? (
          <form action={addCohort} className="card stack" style={{ padding: 18, marginTop: 22, maxWidth: 520 }}>
            <h2 className="section-label">Add a cohort</h2>
            <input type="hidden" name="courseId" value={course.id} />
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Cohort 7" required />
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" placeholder="cohort-7" required />
            <Label htmlFor="startsLabel">When</Label>
            <Input id="startsLabel" name="startsLabel" placeholder="Winter 2027" />
            <Button type="submit" className="self-start">Create cohort</Button>
          </form>
        ) : null}
      </main>
    </>
  );
}
