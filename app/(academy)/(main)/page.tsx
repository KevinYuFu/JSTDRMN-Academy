import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CommunitySection } from "@/components/academy-home/community";
import { GoalSection } from "@/components/academy-home/goal";
import { LearnIntro } from "@/components/academy-home/learn";
import home from "@/components/academy-home/home.module.css";
import { SubscriptionSection } from "@/components/academy-home/subscription";
import { WelcomeHero } from "@/components/academy-home/welcome";
import { listCourses, loadSkillTree } from "@/lib/content";
import { prices } from "@/lib/config";
import { getUser } from "@/lib/auth";
import { homePathPreview } from "@/lib/home-path";
import { localReviewEnabled, localReviewEntryDecision, localReviewEntryFrom } from "@/lib/local-review-entry";

export const metadata = {
  title: "JSTDRMN Academy",
  description: "Find your next step in music production or DJing with JSTDRMN Academy in Toronto.",
};

/** Local review only. Production never reads the request headers. */
async function LocalReviewGate({ searchParams }: { searchParams: Promise<{ entered?: string }> }) {
  const [query, headerList, user] = await Promise.all([searchParams, headers(), getUser()]);
  const entry = localReviewEntryDecision(localReviewEntryFrom(process.env, headerList));
  if (!user && entry.ok && query.entered !== "1") redirect("/local-review/enter");
  return null;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ entered?: string }>;
}) {
  const [programs, tree] = await Promise.all([listCourses(), loadSkillTree()]);
  const tutorialListedAtTwenty = programs.some(
    (program) =>
      program.placement === "plan" &&
      program.access === "subscription" &&
      program.billing === "monthly" &&
      program.priceCents === 2000,
  );
  const preview = homePathPreview(tree);
  const localReview = localReviewEnabled(process.env);

  return (
    <div className={`programs-page ${home.page}`}>
      {localReview ? (
        <Suspense fallback={null}>
          <LocalReviewGate searchParams={searchParams} />
        </Suspense>
      ) : null}
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
