import Link from "next/link";
import type { HomePathPreview } from "@/lib/home-path";
import styles from "./home.module.css";

export function GoalSection({ preview }: { preview: HomePathPreview }) {
  return (
    <section className={styles.section} aria-labelledby="goal-heading">
      <h2 id="goal-heading">Know your goal. Know your next step.</h2>
      <p className={styles.lede}>
        Learning is more manageable when you know where you&apos;re going and what to work on next. Structured paths help
        you do both.
      </p>
      {preview.branches.length === 0 ? (
        <div className={styles.preview}>
          <p className={styles.note}>Illustrative sequence. These steps are not courses on the Skill Tree.</p>
          <ol className={styles.illustrative}>
            <li>Know the goal</li>
            <li>Choose the next step</li>
          </ol>
          <div className={styles.more}>
            <Link className="pill pill-black" href={preview.overviewHref}>
              Open the Skill Tree
            </Link>
          </div>
        </div>
      ) : (
        <div className={styles.preview}>
          <p className={styles.label}>From the Skill Tree</p>
          <ul className={styles.branches}>
            {preview.branches.map((branch) => (
              <li key={branch.id}>
                <Link href={branch.href}>
                  <strong>{branch.title}</strong>
                  {branch.detail ? <span className={styles.detail}>{branch.detail}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
          {preview.flow ? (
            <>
              <p className={styles.label}>{preview.flow.label} path</p>
              <ol className={styles.flow} aria-label={`${preview.flow.label} path`}>
                {preview.flow.steps.map((item, index) => (
                  <li key={item.id}>
                    <Link href={item.href}>
                      <span className={styles.index} aria-hidden="true">
                        {index + 1}
                      </span>
                      <span className={styles.stepTitle}>{item.title}</span>
                      {item.tentative ? <span className={styles.working}>Working title</span> : null}
                    </Link>
                  </li>
                ))}
              </ol>
            </>
          ) : null}
          <div className={styles.more}>
            <Link className={`pill pill-black ${styles.plain}`} href={preview.overviewHref}>
              Open the full Skill Tree
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
