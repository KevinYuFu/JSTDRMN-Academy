import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { ProgramGroup } from "@/components/program-groups";
import { formatCad, prices } from "@/lib/config";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { programGroups } from "@/lib/program-labels";

export const dynamic = "force-dynamic";

export default function ProgramsPage() {
  return (
    <div className="programs-page">
      <AppHeader active="programs" />
      <ProgramsBody />
    </div>
  );
}

async function ProgramsBody() {
  const [programs, user] = await Promise.all([
    prisma.course.findMany({ orderBy: { sort: "asc" } }),
    getUser(),
  ]);
  const banner = programs.find((program) => program.placement === "banner");
  const cards = programs.filter((program) => program.placement === "grid" && program.access !== "request");
  const subscribeHref = user ? "/checkout?product=headliner" : "/signup?next=/checkout?product=headliner";
  const headlinerPrice = formatCad(prices.headlinerMonthlyCents, "month");

  return (
    <>
      {banner ? (
        <section className="headliner-banner" aria-label={banner.title}>
          <div>
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
        {programGroups(cards).map((group) => (
          <ProgramGroup key={group.title} title={group.title}>
            {group.items.map((program) => (
              <article key={program.id} className={`program-card${program.special ? " special" : ""}`}>
                <h3>{program.title}</h3>
                <p>{program.tagline}</p>
                {program.presenter ? <div className="presenter">{program.presenter} presents</div> : null}
                <Link className="pill pill-purple" href={`/programs/${program.slug}`} prefetch>
                  Learn More
                </Link>
              </article>
            ))}
          </ProgramGroup>
        ))}
      </section>
    </>
  );
}
