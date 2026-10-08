import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { applyLink, formatCad, prices } from "@/lib/config";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [bootcamps, user] = await Promise.all([
    prisma.course.findMany({ where: { kind: "bootcamp" }, orderBy: { sort: "asc" } }),
    getUser(),
  ]);
  const checkout = (href: string) => (user ? href : `/signup?next=${encodeURIComponent(href)}`);
  const tiers = [
    {
      kicker: "Membership",
      title: "Headliner",
      amount: formatCad(prices.headlinerMonthlyCents, "month"),
      body: "A subset of the booth tutorials, on rotation. Not every archive tape, and not a bootcamp seat.",
      cta: "Subscribe",
      href: checkout("/checkout?product=headliner"),
    },
    {
      kicker: "One-time",
      title: "Single course",
      amount: formatCad(prices.courseCents),
      body: "Buy one course and keep it. Foundations of Club Mixing is open now. It does not unlock Headliner or Ash F.",
      cta: "See the course",
      href: user ? "/courses/club-mixing" : "/signup?next=/courses/club-mixing",
    },
    {
      kicker: "Add-on",
      title: "Ash F B2B",
      amount: formatCad(prices.ashMonthlyCents, "month"),
      body: "A separate subscription with Ash F on bookings, rates, and playing back-to-back.",
      cta: "Subscribe",
      href: checkout("/checkout?product=ash&slug=ash-f-b2b"),
    },
  ];

  return (
    <>
      <div className="landing-hero">
        <PublicHeader />
        <section className="boot-grid" aria-label="Bootcamps">
          {bootcamps.map((bootcamp) => (
            <article key={bootcamp.id} className={`boot-panel panel-${bootcamp.panel}`}>
              <div className="status">{bootcamp.statusLabel}</div>
              <h2>{bootcamp.title}</h2>
              <p>{bootcamp.description}</p>
              <a className="pill pill-purple" href={applyLink(bootcamp.slug)} target="_blank" rel="noreferrer">
                Get Info
              </a>
            </article>
          ))}
        </section>
      </div>
      <section className="pricing" id="pricing">
        <h2>Pricing</h2>
        <p className="note">Prices in CAD. Bootcamps stay on the JSTDRMN site — you apply there, then a cohort portal opens here.</p>
        <div className="price-grid">
          {tiers.map((tier) => (
            <article key={tier.title} className="price-card">
              <div className="kicker">{tier.kicker}</div>
              <h3>{tier.title}</h3>
              <div className="amount">{tier.amount} CAD</div>
              <p>{tier.body}</p>
              <Link className="pill pill-purple" href={tier.href}>
                {tier.cta}
              </Link>
            </article>
          ))}
        </div>
        <p className="fine">
          Headliner is shown as {formatCad(prices.headlinerMonthlyCents, "month")} until the price is set. Single courses default to{" "}
          {formatCad(prices.courseCents)}. Ash F is {formatCad(prices.ashMonthlyCents, "month")}.
        </p>
      </section>
    </>
  );
}
