import { Suspense } from "react";
import Link from "next/link";
import type { Course } from "@prisma/client";
import { savePrograms } from "@/app/program-edit-actions";
import { EditableProgramText, ProgramEditor } from "@/components/program-editor";
import { ProgramGroup } from "@/components/program-groups";
import { listCourses } from "@/lib/content";
import { formatCad, prices } from "@/lib/config";
import { getUser } from "@/lib/auth";
import { canEditPrograms, listingEditItems } from "@/lib/program-edit";
import { programGroups } from "@/lib/program-labels";

const guestSubscribeHref = "/signup?next=/checkout?product=headliner";

function listingPrograms(programs: Course[]) {
  return {
    banner: programs.find((program) => program.placement === "banner") ?? null,
    cards: programs.filter((program) => program.placement === "grid" && program.access !== "request"),
  };
}

function ProgramsBody({
  programs,
  lead,
  subscribeHref,
}: {
  programs: Course[];
  lead: boolean;
  subscribeHref: string;
}) {
  const { banner, cards } = listingPrograms(programs);
  const headlinerPrice = formatCad(prices.headlinerMonthlyCents, "month");
  return (
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
}

async function ProgramsForViewer({ programs }: { programs: Course[] }) {
  const user = await getUser();
  const { banner, cards } = listingPrograms(programs);
  const editItems = listingEditItems(banner, cards);
  const lead = canEditPrograms(user?.role) && editItems.length > 0;
  const subscribeHref = user ? "/checkout?product=headliner" : guestSubscribeHref;
  const body = <ProgramsBody programs={programs} lead={lead} subscribeHref={subscribeHref} />;
  if (!lead) return body;
  return (
    <ProgramEditor scope="listing" align="page" items={editItems} save={savePrograms}>
      {body}
    </ProgramEditor>
  );
}

export default async function ProgramsPage() {
  const programs = await listCourses();
  return (
    <div className="programs-page">
      <Suspense fallback={<ProgramsBody programs={programs} lead={false} subscribeHref={guestSubscribeHref} />}>
        <ProgramsForViewer programs={programs} />
      </Suspense>
    </div>
  );
}
