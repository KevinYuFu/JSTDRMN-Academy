import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { formatCad, prices, programPriceLabel } from "@/lib/config";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [programs, user] = await Promise.all([
    prisma.course.findMany({ orderBy: { sort: "asc" } }),
    getUser(),
  ]);
  const banner = programs.find((program) => program.placement === "banner");
  const cards = programs.filter((program) => program.placement === "grid");
  const subscribeHref = user ? "/checkout?product=headliner" : "/signup?next=/checkout?product=headliner";
  const headlinerPrice = formatCad(prices.headlinerMonthlyCents, "month");

  return (
    <div className="programs-page">
      <AppHeader />
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
      <section className="program-section" aria-label="Programs">
        <h2>Programs</h2>
        <p className="note">Each program is its own card. Price shows only when that program has one.</p>
        <div className="program-grid">
          {cards.map((program) => {
            const price = programPriceLabel(program);
            return (
              <article key={program.id} className={`program-card${program.special ? " special" : ""}`}>
                <div className="tag">{program.statusLabel}</div>
                {program.presenter ? <div className="presenter">{program.presenter} presents</div> : null}
                <h3>{program.title}</h3>
                <p>{program.tagline}</p>
                {price ? <div className="amount">{price} CAD</div> : null}
                <Link className="pill pill-purple" href={`/programs/${program.slug}`}>
                  Learn More
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
