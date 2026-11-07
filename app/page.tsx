import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { CommunitySection } from "@/components/academy-home/community";
import { GoalSection } from "@/components/academy-home/goal";
import { LearnIntro } from "@/components/academy-home/learn";
import home from "@/components/academy-home/home.module.css";
import { SubscriptionSection } from "@/components/academy-home/subscription";
import { WelcomeHero } from "@/components/academy-home/welcome";
import { ProgramGroup } from "@/components/program-groups";
import { formatCad, prices } from "@/lib/config";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { homePathPreview } from "@/lib/home-path";
import { localReviewEntryDecision, localReviewEntryFrom } from "@/lib/local-review-entry";
import { programGroups } from "@/lib/program-labels";
import { loadSkillTree } from "@/lib/skill-tree-store";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "JSTDRMN Academy",
  description: "Find your next step in music production or DJing with JSTDRMN Academy in Toronto.",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ entered?: string }>;
}) {
  const [programs, user, tree, query, headerList] = await Promise.all([
    prisma.course.findMany({ orderBy: { sort: "asc" } }),
    getUser(),
    loadSkillTree(),
    searchParams,
    headers(),
  ]);
  const entry = localReviewEntryDecision(localReviewEntryFrom(process.env, headerList));
  if (!user && entry.ok && query.entered !== "1") redirect("/local-review/enter");
  const banner = programs.find((program) => program.placement === "banner");
  const cards = programs.filter((program) => program.placement === "grid" && program.access !== "request");
  const subscribeHref = user ? "/checkout?product=headliner" : "/signup?next=/checkout?product=headliner";
  const headlinerPrice = formatCad(prices.headlinerMonthlyCents, "month");
  const tutorialListedAtTwenty = programs.some(
    (program) =>
      program.placement === "plan" &&
      program.access === "subscription" &&
      program.billing === "monthly" &&
      program.priceCents === 2000,
  );
  const preview = homePathPreview(tree);

  return (
    <div className={`programs-page ${home.page}`}>
      <AppHeader active="programs" />
      <main>
        <WelcomeHero />
        <GoalSection preview={preview} />
        <LearnIntro hasPrograms={cards.length > 0} />
        <section id="programs" className="program-section" aria-label="Programs">
          {programGroups(cards).map((group) => (
            <ProgramGroup key={group.title} title={group.title}>
              {group.items.map((program) => (
                <article key={program.id} className={`program-card${program.special ? " special" : ""}`}>
                  <h3>{program.title}</h3>
                  <p>{program.tagline}</p>
                  {program.presenter ? <div className="presenter">{program.presenter} presents</div> : null}
                  <Link className="pill pill-purple" href={`/programs/${program.slug}`}>
                    Learn More
                  </Link>
                </article>
              ))}
            </ProgramGroup>
          ))}
          {cards.length === 0 ? <p className="note">No programs are listed yet.</p> : null}
        </section>
        <CommunitySection />
        <SubscriptionSection
          showsTwenty={tutorialListedAtTwenty || prices.headlinerMonthlyCents === 2000}
          hasCheckout={Boolean(banner)}
          checkoutMatchesTwenty={prices.headlinerMonthlyCents === 2000}
        />
        {banner ? (
          <div className={home.bannerSlot}>
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
          </div>
        ) : null}
      </main>
    </div>
  );
}
