import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { CommunitySection } from "@/components/academy-home/community";
import { GoalSection } from "@/components/academy-home/goal";
import { LearnIntro } from "@/components/academy-home/learn";
import home from "@/components/academy-home/home.module.css";
import { SubscriptionSection } from "@/components/academy-home/subscription";
import { WelcomeHero } from "@/components/academy-home/welcome";
import { prices } from "@/lib/config";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { homePathPreview } from "@/lib/home-path";
import { localReviewEntryDecision, localReviewEntryFrom } from "@/lib/local-review-entry";
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
      <AppHeader />
      <main>
        <WelcomeHero />
        <GoalSection preview={preview} />
        <LearnIntro />
        <CommunitySection />
        <SubscriptionSection
          showsTwenty={tutorialListedAtTwenty || prices.headlinerMonthlyCents === 2000}
          hasCheckout={false}
          checkoutMatchesTwenty={false}
        />
      </main>
    </div>
  );
}
