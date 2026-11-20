import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Course, Cohort } from "@prisma/client";
import { savePrograms } from "@/app/program-edit-actions";
import { EditableProgramText, ProgramEditor } from "@/components/program-editor";
import { VideoUnavailable } from "@/components/video-unavailable";
import { courseBySlug, lessonsForCourse, listCourses } from "@/lib/content";
import { hubspotApplyUrl } from "@/lib/config";
import { getUser } from "@/lib/auth";
import { isStaff } from "@/lib/entitlements";
import { canEditPrograms, detailEditItem } from "@/lib/program-edit";
import { enrollmentPrice } from "@/lib/program-labels";

type ProgramRecord = Course & { cohorts: Cohort[] };

export async function generateStaticParams() {
  const programs = await listCourses();
  return programs.filter((program) => program.placement === "grid").map((program) => ({ slug: program.slug }));
}

function ProgramDetail({
  program,
  hasLessons,
  lead,
  signedIn,
  staff,
  unlocked,
}: {
  program: ProgramRecord;
  hasLessons: boolean;
  lead: boolean;
  signedIn: boolean;
  staff: boolean;
  unlocked: boolean;
}) {
  const price = enrollmentPrice(program);
  const payable =
    program.priceCents != null &&
    (program.access === "purchase" || program.access === "subscription") &&
    (program.billing === "monthly" || program.billing === "once");
  const checkoutHref = signedIn
    ? `/checkout?product=program&slug=${program.slug}`
    : `/signup?next=${encodeURIComponent(`/checkout?product=program&slug=${program.slug}`)}`;
  const applyHref = hubspotApplyUrl(program.hubspotUrl);
  const article = (
    <article className="program-detail">
      <EditableProgramText lead={lead} programId={program.id} field="title" as="h1" className="page-title">
        {program.title}
      </EditableProgramText>
      <EditableProgramText lead={lead} programId={program.id} field="tagline" as="p" className="lead">
        {program.tagline}
      </EditableProgramText>
      <EditableProgramText lead={lead} programId={program.id} field="description" as="p" className="body">
        {program.description}
      </EditableProgramText>
      {program.presenter ? (
        <p className="presenter">
          <EditableProgramText lead={lead} programId={program.id} field="presenter">
            {program.presenter}
          </EditableProgramText>
          {" presents"}
        </p>
      ) : null}
      {price ? (
        <EditableProgramText lead={lead} programId={program.id} field="price" as="p" className="amount">
          {price} CAD
        </EditableProgramText>
      ) : null}
      <div className="detail-actions">
        {program.billing === "application" ? (
          <a className="pill pill-purple" href={applyHref} target="_blank" rel="noreferrer">
            Apply
          </a>
        ) : payable ? (
          <Link className="pill pill-purple" href={checkoutHref}>
            {program.billing === "monthly" ? "Subscribe" : "Buy"}
          </Link>
        ) : null}
        {program.access === "open" && !signedIn ? (
          <Link className="pill pill-purple" href="/login">
            Sign in
          </Link>
        ) : null}
        {hasLessons ? (
          <Link className="pill pill-black" href={`/courses/${program.slug}`}>
            Open lessons
          </Link>
        ) : null}
      </div>
      {hasLessons ? null : <VideoUnavailable />}
      {program.access === "open" ? <p className="note">Free for any signed-in student.</p> : null}
      {program.access === "subscription" && program.planCourseId ? (
        <p className="note">Checkout for this subscription is not open yet.</p>
      ) : null}
      {program.access === "cohort" && program.billing === "application" ? (
        <p className="note">
          Applications stay on the JSTDRMN site. After you’re accepted, this account opens only your cohort.
        </p>
      ) : null}
      {program.access === "cohort" && program.billing === "monthly" && program.priceCents == null ? (
        <p className="note">Price not published.</p>
      ) : null}
      {program.cohorts.length > 0 && staff ? (
        <ul className="cohort-list">
          {program.cohorts.map((cohort) => (
            <li key={cohort.id}>
              <Link href={`/bootcamps/${program.slug}/${cohort.slug}`}>
                {cohort.name}
              </Link>
              <span>{cohort.startsLabel}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );

  return (
    <main className="shell">
      <div className="crumbs">
        <Link href="/programs">Programs</Link> › <b>{program.title}</b>
      </div>
      {unlocked ? <div className="banner">You’re in. This program is on your account.</div> : null}
      {article}
    </main>
  );
}

async function ProgramForViewer({
  program,
  hasLessons,
  searchParams,
}: {
  program: ProgramRecord;
  hasLessons: boolean;
  searchParams: Promise<{ unlocked?: string }>;
}) {
  const [user, query] = await Promise.all([getUser(), searchParams]);
  const lead = canEditPrograms(user?.role);
  const page = (
    <ProgramDetail
      program={program}
      hasLessons={hasLessons}
      lead={lead}
      signedIn={Boolean(user)}
      staff={Boolean(user && isStaff(user.role))}
      unlocked={Boolean(query.unlocked)}
    />
  );
  if (!lead) return page;
  return (
    <ProgramEditor scope="detail" align="shell" items={[detailEditItem(program)]} save={savePrograms}>
      {page}
    </ProgramEditor>
  );
}

export default async function ProgramPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ unlocked?: string }>;
}) {
  const { slug } = await params;
  const program = await courseBySlug(slug);
  if (!program || program.placement !== "grid") {
    if (program?.access === "headliner" || program?.placement === "banner") redirect("/headliner");
    if (program?.access === "request") redirect("/private-sessions");
    notFound();
  }
  const hasLessons = (await lessonsForCourse(program.id)).length > 0;
  const guest = <ProgramDetail program={program} hasLessons={hasLessons} lead={false} signedIn={false} staff={false} unlocked={false} />;
  return (
    <Suspense fallback={guest}>
      <ProgramForViewer program={program} hasLessons={hasLessons} searchParams={searchParams} />
    </Suspense>
  );
}
