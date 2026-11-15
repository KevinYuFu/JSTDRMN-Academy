import type { CSSProperties, ReactNode } from "react";
import { SkillTreeShell } from "@/components/skill-tree/shell";
import home from "@/components/academy-home/home.module.css";
import dash from "@/components/dashboard/dashboard.module.css";
import cards from "@/components/mentor-draft-review.module.css";
import groups from "@/components/program-groups.module.css";
import { pageCopyDefaults } from "@/lib/page-copy";
import { overviewColumns, skillTree, type SkillNode } from "@/lib/skill-tree";
import styles from "./route-skeleton.module.css";
import "@/components/skill-tree/skill-tree.css";

/**
 * Page body only. The academy layout already renders AppHeader above this boundary.
 */
function LoadingChrome({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className} data-route-skeleton={id}>
      <div aria-busy="true" aria-live="polite">
        <p className="sr-only">{label}</p>
        {children}
      </div>
    </div>
  );
}

function Bone({
  width = "100%",
  height = "0.9em",
  className,
}: {
  width?: string;
  height?: string;
  className?: string;
}) {
  return (
    <span
      className={className ? `${styles.bone} ${className}` : styles.bone}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

function Lines({ count, last = "72%" }: { count: number; last?: string }) {
  return (
    <span className={styles.stack} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <Bone key={index} width={index === count - 1 ? last : "100%"} />
      ))}
    </span>
  );
}

function slots(count: number) {
  return Array.from({ length: count }, (_, index) => index);
}

function Photo({ ratio }: { ratio: string }) {
  return <span className={`${styles.bone} ${styles.media}`} style={{ aspectRatio: ratio }} aria-hidden="true" />;
}

export function HomeSkeleton() {
  return (
    <LoadingChrome id="home" label="Loading home" className={`programs-page ${home.page}`}>
      <main>
        <section className={home.hero} aria-hidden="true">
          <div className={home.frame}>
            <div className={home.copy}>
              <h1>Welcome to JSTDRMN Academy.</h1>
              <p className={home.lede}>Find your next step in music production or DJing.</p>
              <div className={home.action}>
                <span className="pill pill-purple">Explore the Skill Tree</span>
              </div>
            </div>
            <figure className={home.figure}>
              <Photo ratio="1000 / 669" />
              <figcaption>
                <Bone width="14ch" height="1em" />
              </figcaption>
            </figure>
          </div>
        </section>
        <section className={home.section} aria-hidden="true">
          <h2>Know your goal. Know your next step.</h2>
          <p className={home.lede}>
            Learning is more manageable when you know where you&apos;re going and what to work on next. Structured paths
            help you do both.
          </p>
          <div className={home.preview}>
            <p className={home.label}>From the Skill Tree</p>
            <ul className={home.branches}>
              {slots(4).map((index) => (
                <li key={index}>
                  <div className={styles.branchCard}>
                    <Bone width="78%" height="1.2em" />
                    <Bone width="90%" height="0.85em" />
                  </div>
                </li>
              ))}
            </ul>
            <p className={home.label}>
              <Bone width="16ch" height="1em" />
            </p>
            <ol className={home.flow}>
              {slots(7).map((index) => (
                <li key={index}>
                  <div className={styles.branchCard}>
                    <span className={home.index}>{index + 1}</span>
                    <Bone width="80%" height="1.2em" />
                  </div>
                </li>
              ))}
            </ol>
            <div className={home.more}>
              <span className="pill pill-black">Open the full Skill Tree</span>
            </div>
          </div>
        </section>
        <section className={home.section} aria-hidden="true">
          <h2>Find your way to learn.</h2>
          <p className={home.lede}>
            Online and in-person courses, including local Toronto producers. Tutorials cover different music-production
            skills.
          </p>
          <div className={home.pair}>
            <figure className={home.figure}>
              <Photo ratio="1000 / 667" />
              <figcaption>
                <Bone width="12ch" height="1em" />
              </figcaption>
            </figure>
            <figure className={home.figure}>
              <Photo ratio="1000 / 1497" />
              <figcaption>
                <Bone width="14ch" height="1em" />
              </figcaption>
            </figure>
          </div>
        </section>
        <section className={home.section} aria-hidden="true">
          <h2>Grow with people who are creating too.</h2>
          <p className={home.lede}>
            Mentors are building their own music and projects. Artists, DJs, and producers help one another grow and
            create.
          </p>
          <div className={home.action}>
            <span className="pill pill-purple">See Private Sessions</span>
          </div>
          <div className={home.wide}>
            <figure className={home.figure}>
              <Photo ratio="1000 / 669" />
              <figcaption>
                <Bone width="16ch" height="1em" />
              </figcaption>
            </figure>
          </div>
        </section>
        <section className={`${home.section} ${home.end}`} aria-hidden="true">
          <h2>Learn more. Help the community grow.</h2>
          <p className={home.lede}>
            A $20/month subscription opens the tutorial library. Subscriptions help JSTDRMN keep fostering community and
            creating opportunities.
          </p>
          <p className={home.note}>This page does not start a purchase.</p>
          <div className={home.action}>
            <span className="pill pill-purple">Browse programs</span>
          </div>
        </section>
      </main>
    </LoadingChrome>
  );
}

function ProgramCard({ special = false }: { special?: boolean }) {
  return (
    <article className={special ? "program-card special" : "program-card"} aria-hidden="true">
      <h3>
        <Bone width="12ch" height="1.15em" />
      </h3>
      <p>
        <Lines count={2} />
      </p>
      <span className="pill pill-purple">Learn More</span>
    </article>
  );
}

export function ProgramsSkeleton() {
  return (
    <LoadingChrome id="programs" label="Loading programs" className="programs-page">
      <section id="programs" className="program-section" aria-label="Programs">
        <div className={groups.group}>
          <h2 className={groups.heading}>Live Programs</h2>
          <div className="program-grid">
            {slots(3).map((index) => (
              <ProgramCard key={index} special={index === 2} />
            ))}
          </div>
        </div>
        <div className={groups.group}>
          <h2 className={groups.heading}>Offline Programs</h2>
          <div className="program-grid">
            {slots(7).map((index) => (
              <ProgramCard key={index} />
            ))}
          </div>
        </div>
      </section>
    </LoadingChrome>
  );
}

export function ProgramDetailSkeleton() {
  return (
    <LoadingChrome id="program" label="Loading program">
      <main className="shell">
        <div className="crumbs">
          Programs › <Bone width="12ch" height="1em" />
        </div>
        <article className="program-detail" aria-hidden="true">
          <h1 className="page-title">
            <Bone width="12ch" height="1.2em" />
          </h1>
          <p className="lead">
            <Bone width="92%" height="1.15em" />
          </p>
          <p className="body">
            <Lines count={6} last="70%" />
          </p>
          <div className="detail-actions">
            <span className="pill pill-black">Open lessons</span>
          </div>
          <p className="note">
            <Bone width="16ch" height="1em" />
          </p>
        </article>
      </main>
    </LoadingChrome>
  );
}

function TreePanel() {
  return (
    <div className="stree-panel" aria-hidden="true">
      <div className="stree-panel-inner">
        <span className="stree-panel-copy">
          <span className="stree-title">
            <Bone width="9ch" height="1.2em" />
          </span>
          <span className="stree-sub">
            <Bone width="100%" height="0.9em" />
          </span>
        </span>
        <span className="stree-foot">
          <Bone width="6ch" height="0.9em" />
        </span>
      </div>
    </div>
  );
}

function PathColumn({ rows }: { rows: number }) {
  return (
    <div className="stree-path" aria-hidden="true">
      <div className="stree-path-intro">
        <TreePanel />
      </div>
      <div className="stree-path-stem stree-path-stem-top" />
      <div className="stree-path-rail">
        <span />
        <span />
      </div>
      <div className="stree-path-board">
        {slots(rows).map((index) => (
          <div key={index} className={index === 0 ? "stree-path-row is-first" : "stree-path-row"}>
            <div className="stree-path-cell">
              <TreePanel />
            </div>
            <div className="stree-path-gap" />
            <div className="stree-path-cell">
              <TreePanel />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkillTreeSkeleton() {
  const columns = overviewColumns(skillTree);
  return (
    <LoadingChrome id="skill-tree" label="Loading the skill tree">
      <SkillTreeShell stack={[skillTree]}>
        <section className="stree-view" aria-label="Academy overview">
          <div className="stree-tree" style={{ "--stree-columns": columns } as CSSProperties}>
            <div className="stree-root-wrap">
              <h1 className="stree-root-heading">{skillTree.card.title}</h1>
            </div>
            <div className="stree-stem" aria-hidden="true" />
            <div className="stree-rail" aria-hidden="true">
              {skillTree.children.map((branch) => (
                <span key={branch.id} />
              ))}
            </div>
            <div className="stree-primary">
              {skillTree.children.map((branch) => (
                <SkillColumn key={branch.id} branch={branch} />
              ))}
            </div>
          </div>
          {skillTree.hint ? <p className="stree-hint">{skillTree.hint}</p> : null}
        </section>
      </SkillTreeShell>
    </LoadingChrome>
  );
}

function SkillColumn({ branch }: { branch: SkillNode }) {
  const wide = Boolean(branch.path || branch.mapFlow);
  const rows = branch.path ? Math.max(branch.path.left.length, branch.path.right.length) : 0;
  return (
    <div className={wide ? "stree-col stree-col-dj" : "stree-col"}>
      {rows > 0 ? <PathColumn rows={rows} /> : <TreePanel />}
    </div>
  );
}

function HeroCopy({ title, lede }: { title: string; lede: string }) {
  return (
    <section className="sessions-hero">
      <h1>{title}</h1>
      <p>{lede}</p>
    </section>
  );
}

export function SessionsSkeleton() {
  const copy = pageCopyDefaults.sessions;
  return (
    <LoadingChrome id="sessions" label="Loading private sessions">
      <main className="sessions-page">
        <HeroCopy title={copy.title} lede={copy.lede} />
        <div className={`${cards.grid} ${cards.liveGrid}`}>
          {slots(4).map((index) => (
            <article key={index} className={`${cards.card} ${cards.liveCard}`} aria-hidden="true">
              <div className={cards.top}>
                <span className={cards.photo} />
                <div className={cards.head}>
                  <h2 className={cards.name}>
                    <Bone width="10ch" height="1.15em" />
                  </h2>
                  <p className={cards.role}>
                    <Bone width="14ch" height="1em" />
                  </p>
                </div>
              </div>
              <p className={cards.bio}>
                <Lines count={2} last="88%" />
              </p>
              <div className={cards.group}>
                <h3 className={cards.groupLabel}>Teaching topics</h3>
                <span className={styles.chips}>
                  {slots(4).map((chip) => (
                    <Bone key={chip} className={styles.chip} width="72px" height="22px" />
                  ))}
                </span>
              </div>
              <div className={cards.group}>
                <h3 className={cards.groupLabel}>Genres</h3>
                <span className={styles.chips}>
                  {slots(2).map((chip) => (
                    <Bone key={chip} className={styles.chip} width="84px" height="22px" />
                  ))}
                </span>
              </div>
            </article>
          ))}
        </div>
      </main>
    </LoadingChrome>
  );
}

function EventCard({ featured = false }: { featured?: boolean }) {
  const Title = featured ? "h2" : "h3";
  return (
    <article className={featured ? "event-feature" : "event-card"} aria-hidden="true">
      <div className="kicker">
        <Bone width="14ch" height="1em" />
      </div>
      <Title>
        <Bone width={featured ? "16ch" : "12ch"} height="1.15em" />
      </Title>
      <p className="event-when">
        <Bone width="18ch" height="1em" />
      </p>
      <p>
        <Lines count={2} />
      </p>
      <p className="note">
        <Bone width="12ch" height="1em" />
      </p>
      <Bone className={styles.pill} width="128px" height="36px" />
    </article>
  );
}

export function EventsSkeleton() {
  const copy = pageCopyDefaults.events;
  return (
    <LoadingChrome id="events" label="Loading events">
      <main className="sessions-page">
        <HeroCopy title={copy.title} lede={copy.lede} />
        <EventCard featured />
        <div className="event-grid">
          <EventCard />
        </div>
      </main>
    </LoadingChrome>
  );
}

function Shelf({ count }: { count: number }) {
  return (
    <div className="shelf">
      {slots(count).map((index) => (
        <div key={index} className="shelf-card panel-purple" aria-hidden="true">
          <Bone width="46%" height="0.8em" />
          <Bone width="84%" height="1.25em" />
          <Bone width="100%" height="2.6em" />
          <Bone width="58%" height="0.85em" />
        </div>
      ))}
    </div>
  );
}

export function MyCoursesSkeleton() {
  return (
    <LoadingChrome id="courses" label="Loading your courses">
      <main className="shell">
        <h1 className="page-title" style={{ marginBottom: 6 }}>
          My Courses
        </h1>
        <p className="note" style={{ marginBottom: 18 }}>
          <Bone width="min(46ch, 100%)" height="1em" />
        </p>
        <div
          className="card"
          style={{
            padding: "14px 16px",
            marginBottom: 18,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <b>Discord</b>
            <div className="note">
              <Bone width="12ch" height="1em" />
            </div>
          </div>
          <Bone className={styles.pill} width="148px" height="36px" />
        </div>
        <h2 className="section-label">Yours</h2>
        <div style={{ marginBottom: 28 }}>
          <Shelf count={12} />
        </div>
        <h2 className="section-label">Locked</h2>
        <Shelf count={2} />
      </main>
    </LoadingChrome>
  );
}

export function StaffDashboardSkeleton() {
  const headers = ["Title", "Status", "Access", "Delivery", "Lessons", "Links"];
  return (
    <LoadingChrome id="teacher" label="Loading the dashboard">
      <main className="shell">
        <h1 className="page-title" style={{ marginBottom: 6 }}>
          <Bone width="6ch" height="1.2em" />
        </h1>
        <p className="note" style={{ marginBottom: 12 }}>
          <Lines count={2} last="88%" />
        </p>
        <div className={dash.shell}>
          <div className={dash.tabs} aria-hidden="true">
            <div className={dash.tab} aria-selected="true">
              Academy Content
            </div>
            <div className={dash.tab} aria-selected="false">
              Manage People
            </div>
            <div className={dash.tab} aria-selected="false">
              Events & Announcements
            </div>
          </div>
          <div className={dash.panel}>
            <section>
              <h2 className="section-label">Programs</h2>
              <p className="note">Overview only. Lessons are added on the lesson page. Program text is edited on the program page.</p>
              <div className={dash.tableWrap}>
                <table className={dash.table}>
                  <thead>
                    <tr>
                      {headers.map((header) => (
                        <th key={header}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {slots(11).map((row) => (
                      <tr key={row}>
                        {headers.map((header) => (
                          <td key={header} data-label={header}>
                            <span className={dash.value}>
                              <Bone width={header === "Title" ? "78%" : "64%"} height="1em" />
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </main>
    </LoadingChrome>
  );
}

function LessonRows({ count }: { count: number }) {
  return (
    <ol>
        {slots(count).map((index) => (
        <li key={index}>
          <div className={styles.lessonRow}>
            <span className="st">{index + 1}</span>
            <span className="t">
              <Bone width="80%" height="1em" />
              <Bone width="8ch" height="0.85em" />
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function LessonSkeleton() {
  return (
    <LoadingChrome id="lesson" label="Loading the lesson">
      <main className="shell">
        <div className="crumbs">
          <Bone width="22ch" height="1em" />
        </div>
        <div className="titlebar">
          <h1 className="page-title">
            <Bone width="14ch" height="1.2em" />
          </h1>
          <div className="progress" aria-hidden="true">
            <div className="lbl">
              <Bone width="38%" height="1em" />
              <Bone width="42%" height="1em" />
            </div>
            <div className="bar">
              <span style={{ width: "35%" }} />
            </div>
          </div>
        </div>
        <div className="learn-grid">
          <div className="video" aria-hidden="true" />
          <aside className="card lessons">
            <h2>Lessons</h2>
            <div className="sub">
              <Bone width="16ch" height="1em" />
            </div>
            <LessonRows count={6} />
          </aside>
        </div>
      </main>
    </LoadingChrome>
  );
}

export function HeadlinerSkeleton() {
  return (
    <LoadingChrome id="headliner" label="Loading Headliner">
      <main className="shell">
        <div className="crumbs">
          <Bone width="16ch" height="1em" />
        </div>
        <div className="titlebar">
          <div>
            <div className="kicker">
              <Bone width="10ch" height="1em" />
            </div>
            <h1 className="page-title">
              <Bone width="10ch" height="1.2em" />
            </h1>
            <p className="note" style={{ marginTop: 8, maxWidth: 640 }}>
              <Bone width="min(52ch, 100%)" height="1em" />
            </p>
          </div>
          <div className="banner-side">
            <Bone width="9ch" height="1.4em" />
            <span className="pill pill-purple">Subscribe</span>
          </div>
        </div>
        <h2 className="section-label">The progression tree</h2>
        <p className="note" style={{ marginBottom: 14, maxWidth: 640 }}>
          <Bone width="min(48ch, 100%)" height="1em" />
        </p>
        <div className="tree" aria-hidden="true">
          <div className="tree-node">
            <Bone width="16ch" height="1.1em" />
            <Bone width="24ch" height="0.9em" />
          </div>
          <ul className="tree-children spread">
            {slots(3).map((index) => (
              <li key={index} className="tree-item">
                <div className="tree-node">
                  <Bone width="12ch" height="1.1em" />
                  <Bone width="16ch" height="0.9em" />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <h2 className="section-label" style={{ marginTop: 28 }}>
          Lessons
        </h2>
        <div className="card" style={{ padding: "8px 16px" }}>
          {slots(4).map((index) => (
            <div key={index} className="list-row">
              <Bone width="40%" height="1em" />
              <Bone width="8ch" height="1em" />
            </div>
          ))}
        </div>
      </main>
    </LoadingChrome>
  );
}

export function BootcampSkeleton() {
  return (
    <LoadingChrome id="bootcamp" label="Loading the bootcamp">
      <main className="shell">
        <div className="crumbs">
          <Bone width="20ch" height="1em" />
        </div>
        <h1 className="page-title" style={{ marginBottom: 8 }}>
          <Bone width="12ch" height="1.2em" />
        </h1>
        <p className="note" style={{ maxWidth: 640, marginBottom: 18 }}>
          <Lines count={2} last="70%" />
        </p>
        <Shelf count={2} />
      </main>
    </LoadingChrome>
  );
}

export function AuthSkeleton({ mode }: { mode: "login" | "signup" }) {
  const title = mode === "login" ? "Log in" : "Create an account";
  return (
    <LoadingChrome id={mode} label={title}>
      <div className="auth-wrap">
        <div className="auth-card" aria-hidden="true">
          <h1>{title}</h1>
          <p className="note" style={{ marginBottom: 16 }}>
            <Lines count={2} last="80%" />
          </p>
          <Bone className={styles.pill} width="100%" height="44px" />
          <div className="auth-divider">or</div>
          <div className="stack">
            {mode === "signup" ? <Bone width="100%" height="46px" /> : null}
            <Bone width="100%" height="46px" />
            <Bone width="100%" height="46px" />
            <Bone className={styles.pill} width="100%" height="40px" />
          </div>
        </div>
      </div>
    </LoadingChrome>
  );
}

/** Short content block for staff and checkout pages. The layout already shows the header. */
export function ShellSkeleton({ id, label }: { id: string; label: string }) {
  return (
    <LoadingChrome id={id} label={label}>
      <main className="shell">
        <h1 className="page-title">
          <Bone width="14ch" height="1.2em" />
        </h1>
        <p className="note" style={{ marginTop: 8 }}>
          <Lines count={2} last="76%" />
        </p>
        <div className="card" style={{ padding: 18, marginTop: 18 }}>
          <Lines count={4} last="60%" />
        </div>
      </main>
    </LoadingChrome>
  );
}
