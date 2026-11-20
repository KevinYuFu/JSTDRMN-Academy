import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Cohort, Course } from "@prisma/client";
import { addCohort } from "@/app/actions";
import { Form } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { courseBySlug, listCourses } from "@/lib/content";
import { getUser } from "@/lib/auth";
import { hubspotApplyUrl } from "@/lib/config";
import { containerAccess, isStaff, type EntitlementRecord } from "@/lib/entitlements";
import { entitlementRecords } from "@/lib/learn";

type Bootcamp = Course & { cohorts: Cohort[] };

export async function generateStaticParams() {
  const courses = await listCourses();
  return courses.filter((course) => course.access === "cohort").map((course) => ({ slug: course.slug }));
}

function BootcampBody({
  course,
  openIds,
  staff,
  added,
  error,
}: {
  course: Bootcamp;
  openIds: ReadonlySet<string>;
  staff: boolean;
  added: boolean;
  error: boolean;
}) {
  const applyHref = hubspotApplyUrl(course.hubspotUrl);
  return (
    <main className="shell">
      <div className="crumbs">
        <Link href="/dashboard">My Courses</Link> › <b>{course.title}</b>
      </div>
      <h1 className="page-title" style={{ marginBottom: 8 }}>{course.title}</h1>
      <p className="note" style={{ maxWidth: 640, marginBottom: 18 }}>{course.description}</p>
      {added ? <div className="banner">Cohort added. Put lessons on it from the course page.</div> : null}
      {error ? <div className="error">Check the cohort name and slug. Slugs have to be unique.</div> : null}
      <div className="shelf">
        {course.cohorts.map((cohort) => {
          const allowed = openIds.has(cohort.id);
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
      {openIds.size === 0 ? (
        <p style={{ marginTop: 18 }}>
          <a className="pill pill-purple" href={applyHref} target="_blank" rel="noreferrer">Apply</a>
        </p>
      ) : null}
      {staff ? (
        <Form action={addCohort} className="card stack" style={{ padding: 18, marginTop: 22, maxWidth: 520 }}>
          <h2 className="section-label">Add a cohort</h2>
          <input type="hidden" name="courseId" value={course.id} />
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="Cohort 7" required />
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" placeholder="cohort-7" required />
          <Label htmlFor="startsLabel">When</Label>
          <Input id="startsLabel" name="startsLabel" placeholder="Winter 2027" />
          <Button type="submit" className="self-start">Create cohort</Button>
        </Form>
      ) : null}
    </main>
  );
}

function openCohortIds(course: Bootcamp, role: string, records: EntitlementRecord[]) {
  return new Set(
    course.cohorts
      .filter(
        (cohort) =>
          containerAccess({
            role,
            access: "cohort",
            courseId: course.id,
            cohortId: cohort.id,
            entitlements: records,
          }).allowed,
      )
      .map((cohort) => cohort.id),
  );
}

async function BootcampForViewer({
  course,
  searchParams,
}: {
  course: Bootcamp;
  searchParams: Promise<{ error?: string; added?: string }>;
}) {
  const [user, query] = await Promise.all([getUser(), searchParams]);
  const records = user ? await entitlementRecords(user.id) : [];
  const role = user?.role ?? "student";
  const openIds = openCohortIds(course, role, records);
  if (openIds.size === 1 && user && role === "student") {
    const cohort = course.cohorts.find((item) => openIds.has(item.id));
    if (cohort) redirect(`/bootcamps/${course.slug}/${cohort.slug}`);
  }
  return (
    <BootcampBody
      course={course}
      openIds={openIds}
      staff={Boolean(user && isStaff(user.role))}
      added={Boolean(query.added)}
      error={Boolean(query.error)}
    />
  );
}

export default async function BootcampPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; added?: string }>;
}) {
  const { slug } = await params;
  const course = await courseBySlug(slug);
  if (!course) notFound();
  if (course.access !== "cohort") redirect("/dashboard");
  // A logged-out visitor has no seat, so every cohort stays on Apply. The clock in
  // containerAccess stays in the live part, where a signed-in seat can open one.
  const guest = <BootcampBody course={course} openIds={new Set()} staff={false} added={false} error={false} />;
  return (
    <Suspense fallback={guest}>
      <BootcampForViewer course={course} searchParams={searchParams} />
    </Suspense>
  );
}
