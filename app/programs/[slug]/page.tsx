import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { hubspotApplyUrl, programPriceLabel } from "@/lib/config";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProgramPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ unlocked?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const program = await prisma.course.findUnique({
    where: { slug },
    include: { cohorts: { orderBy: { sort: "asc" } }, lessons: { select: { id: true } } },
  });
  if (!program || program.placement === "banner" || program.access === "request") {
    if (program?.access === "headliner") redirect("/headliner");
    if (program?.access === "request") redirect("/private-sessions");
    notFound();
  }
  const user = await getUser();
  const price = programPriceLabel(program);
  const checkoutHref = user
    ? `/checkout?product=program&slug=${program.slug}`
    : `/signup?next=${encodeURIComponent(`/checkout?product=program&slug=${program.slug}`)}`;
  const applyHref = hubspotApplyUrl(program.hubspotUrl);
  const hasLessons = program.lessons.length > 0;

  return (
    <>
      <AppHeader active="programs" />
      <main className="shell">
        <div className="crumbs">
          <Link href="/">Programs</Link> › <b>{program.title}</b>
        </div>
        {query.unlocked ? <div className="banner">You’re in. This program is on your account.</div> : null}
        <article className="program-detail">
          <div className="tag">{program.statusLabel}</div>
          {program.presenter ? <p className="presenter">{program.presenter} presents</p> : null}
          <h1 className="page-title">{program.title}</h1>
          <p className="lead">{program.tagline}</p>
          {price ? <p className="amount">{price} CAD</p> : null}
          <p className="body">{program.description}</p>
          <div className="detail-actions">
            {program.billing === "application" ? (
              <a className="pill pill-purple" href={applyHref} target="_blank" rel="noreferrer">
                Apply
              </a>
            ) : program.billing === "monthly" || program.billing === "once" ? (
              <Link className="pill pill-purple" href={checkoutHref}>
                {program.billing === "monthly" ? "Subscribe" : "Buy"}
              </Link>
            ) : null}
            {hasLessons ? (
              <Link className="pill pill-black" href={`/courses/${program.slug}`}>
                Open lessons
              </Link>
            ) : null}
          </div>
          {program.access === "cohort" ? (
            <p className="note">
              Applications stay on the JSTDRMN site. After you’re accepted, this account opens only your cohort.
            </p>
          ) : null}
          {program.cohorts.length > 0 && user && (user.role === "teacher" || user.role === "admin") ? (
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
      </main>
    </>
  );
}
