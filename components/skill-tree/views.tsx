import type { CSSProperties, ReactNode } from "react";
import {
  advancedDj,
  copy,
  djBootcamp,
  djHubCards,
  djPath,
  djSkillStep,
  drillHref,
  mashup,
  mixMaster,
  mixMasterStep,
  overviewBranches,
  pendingBranches,
  production,
  productionCourseStep,
  productionSkillStep,
  skillCount,
  topicCount,
  type FlowNode,
  type OverviewBranch,
  type SkillTreeStep,
} from "@/lib/skill-tree";
import { SkillPanel } from "./panel";

function Bob({ index, children, className = "" }: { index: number; children: ReactNode; className?: string }) {
  return (
    <div className={`stree-bob ${className}`.trim()} style={{ "--i": index } as CSSProperties}>
      {children}
    </div>
  );
}

function FlowCard({ stack, node, index }: { stack: SkillTreeStep[]; node: FlowNode; index: number }) {
  return (
    <Bob index={index}>
      <SkillPanel
        title={node.title}
        sub={node.sub}
        foot={copy.open}
        href={drillHref(stack, node.step)}
        accent={node.accent}
        label={node.label}
      />
    </Bob>
  );
}

function DjFlow({ stack, flow }: { stack: SkillTreeStep[]; flow: NonNullable<OverviewBranch["flow"]> }) {
  const child = flow.right.child;
  return (
    <div className="stree-dj-local" aria-label="DJ course flowchart">
      <div className="stree-dj-stem" aria-hidden="true" />
      <div className="stree-dj-rail" aria-hidden="true">
        <span />
        <span />
      </div>
      <div className="stree-dj-pair">
        <FlowCard stack={stack} node={flow.left} index={4} />
        <div className="stree-mashup-stack">
          <FlowCard stack={stack} node={flow.right} index={5} />
          {child ? (
            <>
              <div className="stree-prod-stem" aria-hidden="true" />
              <div className="stree-prod">
                <FlowCard stack={stack} node={child} index={6} />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Overview({ stack }: { stack: SkillTreeStep[] }) {
  return (
    <section className="stree-view" aria-label="Academy overview">
      <div className="stree-tree">
        <div className="stree-root-wrap">
          <h1 className="stree-root-heading">{copy.academyTitle}</h1>
        </div>
        <div className="stree-stem" aria-hidden="true" />
        <div className="stree-rail" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="stree-primary">
          {overviewBranches.map((branch, index) => (
            <div key={branch.id} className={branch.flow ? "stree-col stree-col-dj" : "stree-col"}>
              <Bob index={index}>
                <SkillPanel
                  title={branch.title}
                  sub={branch.sub}
                  foot={copy.open}
                  href={drillHref(stack, branch.step)}
                  accent={branch.accent}
                  label={branch.label}
                />
              </Bob>
              {branch.flow ? <DjFlow stack={stack} flow={branch.flow} /> : null}
            </div>
          ))}
        </div>
      </div>
      <p className="stree-hint">{copy.hint}</p>
    </section>
  );
}

function PurposeView({ id }: { id: "community" | "branding" | "education" }) {
  const branch = pendingBranches[id];
  return (
    <section className="stree-view" aria-label={branch.heading}>
      <div className="stree-section-head">
        <p className="stree-eyebrow">{branch.eyebrow}</p>
        <h1>{branch.heading}</h1>
        <p>{branch.purpose}</p>
      </div>
      <div className="stree-stack stree-narrow">
        <SkillPanel title={branch.panelTitle} sub={branch.purpose} foot={branch.status} accent={branch.requiredForTeachers} />
        <div className="stree-note">
          <strong>{copy.noInventedCurriculum}</strong> {branch.status}
        </div>
      </div>
    </section>
  );
}

function DjHub({ stack }: { stack: SkillTreeStep[] }) {
  return (
    <section className="stree-view" aria-label="DJ branch">
      <div className="stree-section-head">
        <p className="stree-eyebrow">{djPath.eyebrow}</p>
        <h1>{djPath.heading}</h1>
        <p>{djPath.purpose}</p>
      </div>
      <div className="stree-stack stree-hub-width">
        <SkillPanel
          title={djHubCards.bootcamp.title}
          sub={djHubCards.bootcamp.sub}
          foot={copy.open}
          href={drillHref(stack, djHubCards.bootcamp.step)}
          label={djHubCards.bootcamp.label}
        />
        <div className="stree-dj-hub">
          <SkillPanel
            title={djHubCards.advanced.title}
            sub={djHubCards.advanced.sub}
            foot={copy.open}
            href={drillHref(stack, djHubCards.advanced.step)}
            accent
            label={djHubCards.advanced.label}
          />
          <div className="stree-hub-mashup">
            <SkillPanel
              title={djHubCards.mashup.title}
              sub={djHubCards.mashup.sub}
              foot={copy.open}
              href={drillHref(stack, djHubCards.mashup.step)}
              label={djHubCards.mashup.label}
            />
            <div className="stree-flow-stem" aria-hidden="true" />
            <SkillPanel
              title={djHubCards.production.title}
              sub={djHubCards.production.sub}
              foot={copy.open}
              href={drillHref(stack, djHubCards.production.step)}
              label={djHubCards.production.label}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function AdvancedDjView() {
  return (
    <section className="stree-view" aria-label="Advanced DJ">
      <div className="stree-section-head">
        <p className="stree-eyebrow">DJ</p>
        <h1>{advancedDj.title}</h1>
        <p>{advancedDj.purpose}</p>
      </div>
      <div className="stree-stack stree-narrow">
        <SkillPanel title={advancedDj.title} sub={copy.workingTitleSub} foot={advancedDj.status} accent />
        <div className="stree-note">
          <strong>{copy.workingTitleLead}</strong> {advancedDj.status} {copy.noInventedCurriculum}
        </div>
      </div>
    </section>
  );
}

function DjBootcampView({ stack }: { stack: SkillTreeStep[] }) {
  return (
    <section className="stree-view" aria-label="DJ Bootcamp">
      <div className="stree-section-head">
        <p className="stree-eyebrow">{djBootcamp.title}</p>
        <h1>{djBootcamp.title}</h1>
        <p>{djBootcamp.blurb}</p>
      </div>
      <div className="stree-lane stree-core">
        <p className="stree-lane-label">{copy.coreFoundations}</p>
        <SkillPanel title={copy.coreDjSkills} foot={copy.taughtInBootcamp}>
          <ul className="stree-details">
            {djBootcamp.core.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SkillPanel>
      </div>
      <div className="stree-lane">
        <p className="stree-lane-label">{copy.skillCategories}</p>
        <div className="stree-grid-cats">
          {djBootcamp.categories.map((category) => {
            const step = djSkillStep(category.id);
            if (!step) return null;
            return (
              <SkillPanel
                key={category.id}
                title={category.title}
                sub={skillCount(category.items.length)}
                foot={copy.openDetails}
                href={drillHref(stack, step)}
                label={`Open ${category.title}`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function DjSkillView({ id }: { id: string }) {
  const category = djBootcamp.categories.find((item) => item.id === id);
  if (!category) return null;
  return (
    <section className="stree-view" aria-label={category.title}>
      <div className="stree-section-head">
        <p className="stree-eyebrow">{djBootcamp.title}</p>
        <h1>{category.title}</h1>
        <p>{copy.djSkillIntro}</p>
      </div>
      <div className="stree-narrow">
        <SkillPanel title={category.title} foot={djBootcamp.title}>
          <ul className="stree-details">
            {category.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SkillPanel>
      </div>
    </section>
  );
}

function MashupView() {
  return (
    <section className="stree-view" aria-label="Ableton Mashup Bootcamp">
      <div className="stree-section-head">
        <p className="stree-eyebrow">Ableton / Mashup</p>
        <h1>{mashup.title}</h1>
        <p>{mashup.blurb}</p>
      </div>
      <div className="stree-narrow">
        <SkillPanel title={copy.mashupFocus} sub={copy.mashupCovers} foot={copy.leadsToProduction} accent>
          <div className="stree-chips">
            {mashup.items.map((item) => (
              <span key={item.label} className={item.hot ? "stree-chip is-hot" : "stree-chip"}>
                {item.label}
              </span>
            ))}
          </div>
        </SkillPanel>
      </div>
    </section>
  );
}

function ProductionView({ stack }: { stack: SkillTreeStep[] }) {
  return (
    <section className="stree-view" aria-label="Music Production">
      <div className="stree-section-head">
        <p className="stree-eyebrow">{production.eyebrow}</p>
        <h1>{production.title}</h1>
        <p>{production.blurb}</p>
      </div>
      <div className="stree-lane">
        <p className="stree-lane-label">{copy.courseLanes}</p>
        <div className="stree-grid-3">
          {production.courses.map((course) => {
            const step = productionCourseStep(course.id);
            if (!step) return null;
            return (
              <SkillPanel
                key={course.id}
                title={course.title}
                sub={course.note ?? copy.courseLaneSub}
                foot={course.foot}
                accent={course.accent}
                href={drillHref(stack, step)}
                label={`Open ${course.title}`}
              />
            );
          })}
        </div>
      </div>
      <div className="stree-lane stree-narrow">
        <p className="stree-lane-label">{copy.underProduction}</p>
        <SkillPanel
          title={mixMaster.title}
          sub={mixMaster.status}
          foot={copy.curriculumLater}
          href={drillHref(stack, mixMasterStep)}
          label="Open Mixing and Mastering"
        />
      </div>
      <div className="stree-lane">
        <p className="stree-lane-label">{copy.sharedSkills}</p>
        <div className="stree-grid-cats">
          {production.skills.map((skill) => {
            const step = productionSkillStep(skill.id);
            if (!step) return null;
            return (
              <SkillPanel
                key={skill.id}
                title={skill.title}
                sub={topicCount(skill.items.length)}
                foot={copy.openDetails}
                href={drillHref(stack, step)}
                label={`Open ${skill.title}`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ProductionCourseView({ id }: { id: string }) {
  const course = production.courses.find((item) => item.id === id);
  if (!course) return null;
  return (
    <section className="stree-view" aria-label={course.title}>
      <div className="stree-section-head">
        <p className="stree-eyebrow">{production.eyebrow}</p>
        <h1>{course.title}</h1>
        <p>{course.note ?? copy.courseLaneIntro}</p>
      </div>
      <div className="stree-stack stree-narrow">
        <SkillPanel title={course.title} sub={course.note ?? copy.knownCourseLane} foot={course.foot} accent={course.accent} />
        <div className="stree-note">
          <strong>{copy.skillPlacementLead}</strong> {copy.skillPlacementBody}
        </div>
      </div>
    </section>
  );
}

function ProductionSkillView({ id }: { id: string }) {
  const skill = production.skills.find((item) => item.id === id);
  if (!skill) return null;
  return (
    <section className="stree-view" aria-label={skill.title}>
      <div className="stree-section-head">
        <p className="stree-eyebrow">{production.eyebrow}</p>
        <h1>{skill.title}</h1>
        <p>{copy.prodSkillIntro}</p>
      </div>
      <div className="stree-narrow">
        <SkillPanel title={skill.title} foot={copy.sharedSkillTree}>
          <ul className="stree-details">
            {skill.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SkillPanel>
      </div>
    </section>
  );
}

function MixMasterView() {
  return (
    <section className="stree-view" aria-label="Mixing and Mastering">
      <div className="stree-section-head">
        <p className="stree-eyebrow">{production.eyebrow}</p>
        <h1>{mixMaster.title}</h1>
        <p>{mixMaster.status}</p>
      </div>
      <div className="stree-stack stree-narrow">
        <SkillPanel title={mixMaster.title} sub={copy.mixLivesUnder} foot={copy.curriculumNotSupplied} />
        <div className="stree-note">
          <strong>{copy.noInventedModules}</strong> {copy.mixPlacementBody}
        </div>
      </div>
    </section>
  );
}

export function SkillTreeView({ stack }: { stack: SkillTreeStep[] }) {
  const step = stack[stack.length - 1] ?? { name: "Overview", view: "overview" as const };
  switch (step.view) {
    case "overview":
      return <Overview stack={stack} />;
    case "community":
    case "branding":
    case "education":
      return <PurposeView id={step.view} />;
    case "dj":
      return <DjHub stack={stack} />;
    case "advanced-dj":
      return <AdvancedDjView />;
    case "dj-bootcamp":
      return <DjBootcampView stack={stack} />;
    case "dj-skill":
      return <DjSkillView id={step.payload ?? ""} />;
    case "mashup":
      return <MashupView />;
    case "production":
      return <ProductionView stack={stack} />;
    case "prod-course":
      return <ProductionCourseView id={step.payload ?? ""} />;
    case "prod-skill":
      return <ProductionSkillView id={step.payload ?? ""} />;
    case "mix-master":
      return <MixMasterView />;
    default:
      return <Overview stack={stack} />;
  }
}
