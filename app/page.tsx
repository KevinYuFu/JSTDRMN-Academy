import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { ProgramBadges, SubscriptionNote } from "@/components/program-badges";
import { ProgramGroup } from "@/components/program-groups";
import { formatCad, prices } from "@/lib/config";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { displayPrice, programBadges, programGroups, showStatusLabel } from "@/lib/program-labels";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [programs, user] = await Promise.all([
    prisma.course.findMany({ orderBy: { sort: "asc" } }),
    getUser(),
  ]);
  const banner = programs.find((program) => program.placement === "banner");
  const cards = programs.filter((program) => program.placement === "grid" && program.access !== "request");
  const plans = new Map(programs.map((program) => [program.id, program]));
  const subscribeHref = user ? "/checkout?product=headliner" : "/signup?next=/checkout?product=headliner";
  const headlinerPrice = formatCad(prices.headlinerMonthlyCents, "month");

  return (
    <div className="programs-page">
      <AppHeader active="programs" />
      {banner ? (
        <section className="headliner-banner" aria-label={banner.title}>
          <div>
            <div className="kicker">{banner.statusLabel}</div>
            <h2>{banner.title}</h2>
            <p>{banner.tagline}</p>
          </div>
          <div className="banner-side">
            <div className="amount">{headlinerPrice} CAD</div>
            <Link className="pill pill-purple" href={subscribeHref}>
              Subscribe
            </Link>
          </div>
        </section>
      ) : null}
      <section id="programs" className="program-section" aria-label="Programs">
        <p className="note">Group classes and self-paced lessons. Price shows only when that program has one.</p>
        {programGroups(cards).map((group) => (
          <ProgramGroup key={group.title} title={group.title}>
            {group.items.map((program) => {
              const badges = programBadges(program);
              const plan = program.planCourseId ? plans.get(program.planCourseId) ?? null : null;
              const price = displayPrice(program, plan);
              const status = showStatusLabel(program.statusLabel, badges);
              return (
                <article key={program.id} className={`program-card${program.special ? " special" : ""}`}>
                  <ProgramBadges delivery={program.delivery} setting={program.setting} access={program.access} />
                  {status ? <div className="tag">{program.statusLabel}</div> : null}
                  {program.presenter ? <div className="presenter">{program.presenter} presents</div> : null}
                  <h3>{program.title}</h3>
                  <p>{program.tagline}</p>
                  {price ? <div className="amount">{price} CAD</div> : null}
                  {program.access === "subscription" && plan ? <SubscriptionNote /> : null}
                  <Link className="pill pill-purple" href={`/programs/${program.slug}`}>
                    Learn More
                  </Link>
                </article>
              );
            })}
          </ProgramGroup>
        ))}
      </section>
    </div>
  );
}
