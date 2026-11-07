import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ProgramBadges, SubscriptionNote } from "@/components/program-badges";
import { VideoUnavailable } from "@/components/video-unavailable";
import { hubspotApplyUrl } from "@/lib/config";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { isStaff } from "@/lib/entitlements";
import { displayPrice, programBadges, showStatusLabel } from "@/lib/program-labels";

export const dynamic = "force-dynamic";

export default async function ProgramPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ unlocked?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const [program, user] = await Promise.all([
    prisma.course.findUnique({
      where: { slug },
      include: {
        cohorts: { orderBy: { sort: "asc" } },
        lessons: { select: { id: true } },
        plan: true,
      },
    }),
    getUser(),
  ]);
  if (!program || program.placement !== "grid") {
    if (program?.access === "headliner" || program?.placement === "banner") redirect("/headliner");
    if (program?.access === "request") redirect("/private-sessions");
    notFound();
  }
  const badges = programBadges(program);
  const price = displayPrice(program, program.plan);
  const status = showStatusLabel(program.statusLabel, badges);
  const payable =
    program.priceCents != null &&
    (program.access === "purchase" || program.access === "subscription") &&
    (program.billing === "monthly" || program.billing === "once");
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
          <ProgramBadges delivery={program.delivery} setting={program.setting} access={program.access} />
          {status ? <div className="tag">{program.statusLabel}</div> : null}
          {program.presenter ? <p className="presenter">{program.presenter} presents</p> : null}
          <h1 className="page-title">{program.title}</h1>
          <p className="lead">{program.tagline}</p>
          {price ? <p className="amount">{price} CAD</p> : null}
          {program.access === "subscription" && program.plan ? <SubscriptionNote /> : null}
          <p className="body">{program.description}</p>
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
            {program.access === "open" && !user ? (
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
          {program.access === "open" ? (
            <p className="note">Free for any signed-in student.</p>
          ) : null}
          {program.access === "subscription" && program.plan ? (
            <p className="note">Checkout for this subscription is not open yet.</p>
          ) : null}
          {program.access === "cohort" && program.billing === "application" ? (
            <p className="note">
              Applications stay on the JSTDRMN site. After you’re accepted, this account opens only your cohort.
            </p>
          ) : null}
          {program.access === "cohort" && program.billing === "monthly" && program.priceCents == null ? (
            <p className="note">{program.setting ? "Price not published." : "Price not confirmed."}</p>
          ) : null}
          {program.cohorts.length > 0 && user && isStaff(user.role) ? (
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
