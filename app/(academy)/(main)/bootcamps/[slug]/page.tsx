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

function CohortShelfFallback({ count }: { count: number }) {
  return (
    <div className="shelf" aria-hidden="true">
      {Array.from({ length: Math.max(count, 1) }, (_, index) => (
        <div key={index} className="shelf-card" />
      ))}
    </div>
  );
}

function CohortCard({
  course,
  cohort,
  allowed,
  applyHref,
}: {
  course: Bootcamp;
  cohort: Cohort;
  allowed: boolean;
  applyHref: string;
}) {
  return (
    <Link href={allowed ? `/bootcamps/${course.slug}/${cohort.slug}` : applyHref} className={`shelf-card panel-${course.panel}`}>
      <div className="kicker">{allowed ? "Your portal" : course.statusLabel}</div>
      <h3>{cohort.name}</h3>
      <p>{cohort.startsLabel}</p>
      <p style={{ marginTop: 8, color: "#fff2cc" }}>{allowed ? "Open lessons" : "Apply for a seat"}</p>
    </Link>
  );
}

function openCohorts(course: Bootcamp, role: string, records: EntitlementRecord[]) {
  return course.cohorts.filter((cohort) =>
    containerAccess({
      role,
      access: "cohort",
      courseId: course.id,
      cohortId: cohort.id,
      entitlements: records,
    }).allowed,
  );
}

async function BootcampLive({
  course,
  searchParams,
}: {
  course: Bootcamp;
  searchParams: Promise<{ error?: string; added?: string }>;
}) {
  const [user, query] = await Promise.all([getUser(), searchParams]);
  const records = user ? await entitlementRecords(user.id) : [];
  const role = user?.role ?? "student";
  const open = openCohorts(course, role, records);
  if (open.length === 1 && user && role === "student") {
    redirect(`/bootcamps/${course.slug}/${open[0].slug}`);
  }
  const applyHref = hubspotApplyUrl(course.hubspotUrl);
  return (
    <>
      {query.added ? <div className="banner">Cohort added. Put lessons on it from the course page.</div> : null}
      {query.error ? <div className="error">Check the cohort name and slug. Slugs have to be unique.</div> : null}
      <div className="shelf">
        {course.cohorts.map((cohort) => (
          <CohortCard key={cohort.id} course={course} cohort={cohort} allowed={open.some((item) => item.id === cohort.id)} applyHref={applyHref} />
        ))}
        {course.cohorts.length === 0 ? (
          <a className={`shelf-card panel-${course.panel}`} href={applyHref} target="_blank" rel="noreferrer">
            <div className="kicker">{course.statusLabel}</div>
            <h3>{course.title}</h3>
            <p>No cohort portal is open yet. Applications stay on the JSTDRMN site.</p>
          </a>
        ) : null}
      </div>
      {open.length === 0 ? (
        <p style={{ marginTop: 18 }}>
          <a className="pill pill-purple" href={applyHref} target="_blank" rel="noreferrer">
            Apply
          </a>
        </p>
      ) : null}
      {user && isStaff(user.role) ? (
        <Form action={addCohort} className="card stack" style={{ padding: 18, marginTop: 22, maxWidth: 520 }}>
          <h2 className="section-label">Add a cohort</h2>
          <input type="hidden" name="courseId" value={course.id} />
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="Cohort 7" required />
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" placeholder="cohort-7" required />
          <Label htmlFor="startsLabel">When</Label>
          <Input id="startsLabel" name="startsLabel" placeholder="Winter 2027" />
          <Button type="submit" className="self-start">
            Create cohort
          </Button>
        </Form>
      ) : null}
    </>
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
  return (
    <main className="shell">
      <div className="crumbs">
        <Link href="/dashboard">My Courses</Link> › <b>{course.title}</b>
      </div>
      <h1 className="page-title" style={{ marginBottom: 8 }}>{course.title}</h1>
      <p className="note" style={{ maxWidth: 640, marginBottom: 18 }}>{course.description}</p>
      <Suspense fallback={<CohortShelfFallback count={course.cohorts.length} />}>
        <BootcampLive course={course} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
