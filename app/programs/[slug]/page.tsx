import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requestSession } from "@/app/actions";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { hubspotApplyUrl, programPriceLabel } from "@/lib/config";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProgramPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ unlocked?: string; sent?: string; error?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const program = await prisma.course.findUnique({
    where: { slug },
    include: { cohorts: { orderBy: { sort: "asc" } }, lessons: { select: { id: true } } },
  });
  if (!program || program.placement === "banner") {
    if (program?.access === "headliner") redirect("/headliner");
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
      <AppHeader />
      <main className="shell">
        <div className="crumbs">
          <Link href="/">Programs</Link> › <b>{program.title}</b>
        </div>
        {query.unlocked ? <div className="banner">You’re in. This program is on your account.</div> : null}
        {query.sent ? <div className="banner">Request received. A teacher can see it on the desk. Nothing is booked yet.</div> : null}
        {query.error ? <div className="error">Name, email, topic, and preferred times are all required.</div> : null}
        <article className="program-detail">
          <div className="tag">{program.statusLabel}</div>
          {program.presenter ? <p className="presenter">{program.presenter} presents</p> : null}
          <h1 className="page-title">{program.title}</h1>
          <p className="lead">{program.tagline}</p>
          {price ? <p className="amount">{price} CAD</p> : null}
          <p className="body">{program.description}</p>
          {program.billing === "request" ? (
            <form action={requestSession} className="card stack request-form">
              <input type="hidden" name="courseId" value={program.id} />
              <div className="field">
                <Label htmlFor="session-name">Name</Label>
                <Input id="session-name" name="name" required minLength={2} maxLength={80} defaultValue={user?.name ?? ""} autoComplete="name" />
              </div>
              <div className="field">
                <Label htmlFor="session-email">Email</Label>
                <Input id="session-email" name="email" type="email" required maxLength={120} defaultValue={user?.email ?? ""} autoComplete="email" />
              </div>
              <div className="field">
                <Label htmlFor="session-topic">Topic</Label>
                <Textarea id="session-topic" name="topic" required minLength={2} maxLength={500} placeholder="What do you want to work on?" />
              </div>
              <div className="field">
                <Label htmlFor="session-times">Preferred times</Label>
                <Textarea id="session-times" name="preferredTimes" required minLength={2} maxLength={500} placeholder="Days and times that work for you" />
              </div>
              <p className="note">Scheduling and payment come later. This only sends a request.</p>
              <Button type="submit">Request a session</Button>
            </form>
          ) : (
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
          )}
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
