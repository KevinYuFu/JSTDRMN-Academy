import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { savePrograms } from "@/app/program-edit-actions";
import { AppHeader } from "@/components/app-header";
import { EditableProgramText, ProgramEditor } from "@/components/program-editor";
import { ProgramGroup } from "@/components/program-groups";
import { formatCad, prices } from "@/lib/config";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { canEditPrograms, listingEditItems } from "@/lib/program-edit";
import { programGroups } from "@/lib/program-labels";
import { localReviewEntryDecision, localReviewEntryFrom } from "@/lib/local-review-entry";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ entered?: string }>;
}) {
  const [programs, user, query, headerList] = await Promise.all([
    prisma.course.findMany({ orderBy: { sort: "asc" } }),
    getUser(),
    searchParams,
    headers(),
  ]);
  const entry = localReviewEntryDecision(localReviewEntryFrom(process.env, headerList));
  if (!user && entry.ok && query.entered !== "1") redirect("/local-review/enter");
  const banner = programs.find((program) => program.placement === "banner");
  const cards = programs.filter((program) => program.placement === "grid" && program.access !== "request");
  const subscribeHref = user ? "/checkout?product=headliner" : "/signup?next=/checkout?product=headliner";
  const headlinerPrice = formatCad(prices.headlinerMonthlyCents, "month");
  const editItems = listingEditItems(banner ?? null, cards);
  const lead = canEditPrograms(user?.role) && editItems.length > 0;
  const programsBody = (
    <>
      {banner ? (
        <section className="headliner-banner" aria-label={banner.title}>
          <div>
            <EditableProgramText lead={lead} programId={banner.id} field="title" as="h2">
              {banner.title}
            </EditableProgramText>
            <EditableProgramText lead={lead} programId={banner.id} field="tagline" as="p">
              {banner.tagline}
            </EditableProgramText>
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
                <EditableProgramText lead={lead} programId={program.id} field="title" as="h3">
                  {program.title}
                </EditableProgramText>
                <EditableProgramText lead={lead} programId={program.id} field="tagline" as="p">
                  {program.tagline}
                </EditableProgramText>
                {program.presenter ? (
                  <div className="presenter">
                    <EditableProgramText lead={lead} programId={program.id} field="presenter">
                      {program.presenter}
                    </EditableProgramText>
                    {" presents"}
                  </div>
                ) : null}
                <Link className="pill pill-purple" href={`/programs/${program.slug}`}>
                  Learn More
                </Link>
              </article>
            ))}
          </ProgramGroup>
        ))}
      </section>
    </>
  );

  return (
    <div className="programs-page">
      <AppHeader active="programs" />
      {lead ? (
        <ProgramEditor scope="listing" align="page" items={editItems} save={savePrograms}>
          {programsBody}
        </ProgramEditor>
      ) : (
        programsBody
      )}
    </div>
  );
}
