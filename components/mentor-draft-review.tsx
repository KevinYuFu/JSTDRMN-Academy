import { MENTOR_DRAFT_RATE_LABEL, MENTOR_DRAFTS } from "@/lib/mentor-drafts";
import styles from "./mentor-draft-review.module.css";

export function MentorDraftReview() {
  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <div className={styles.banner} role="status">
          DRAFT — not published. Local review only.
          <small>
            Not the live Academy app or database. This page reads the repo draft and does not save or publish mentors. Not a bookable offering.
          </small>
        </div>

        <h1 className={styles.title}>One-on-one mentor sessions</h1>
        <p className={styles.sub}>Content review for mentor profiles before anything goes live.</p>

        <div className={styles.priceNote}>
          <strong>Provisional pricing:</strong> {MENTOR_DRAFT_RATE_LABEL} for everyone listed below. Idea only — not live checkout.
        </div>

        <div className={styles.grid}>
          {MENTOR_DRAFTS.map((mentor) => (
            <article key={mentor.slug} className={styles.card} data-mentor={mentor.slug}>
              <div className={styles.top}>
                {/* Fixed 96px / 88px crop from the reviewed HTML. next/image wraps the box. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.photo}
                  src={mentor.portraitSrc}
                  alt={mentor.portraitAlt}
                  width={96}
                  height={96}
                />
                <div className={styles.head}>
                  <h2 className={styles.name}>{mentor.name}</h2>
                  <div>
                    <span className={styles.price}>{MENTOR_DRAFT_RATE_LABEL}</span>
                    <span className={styles.provisional}>provisional</span>
                  </div>
                </div>
              </div>
              <p className={styles.bio}>{mentor.bio}</p>
              <TagGroup label="Teaching topics" items={mentor.specialties} tone="topic" />
              <TagGroup label="Genres" items={mentor.genres} tone="genre" />
              <p className={styles.meta}>
                <strong>Instagram:</strong>{" "}
                <a className={styles.link} href={mentor.instagramUrl} target="_blank" rel="noopener noreferrer">
                  {mentor.instagramLabel}
                </a>
              </p>
            </article>
          ))}
        </div>

        <div className={styles.footer}>
          <p>Draft preview in the repo. No booking or payment. Private Sessions still reads mentor rows from the database.</p>
          <p>Portrait files are for this review. Permission to reuse them on the live site is unconfirmed.</p>
        </div>
      </div>
    </main>
  );
}

function TagGroup({
  label,
  items,
  tone,
}: {
  label: string;
  items: readonly string[];
  tone: "topic" | "genre";
}) {
  return (
    <div className={styles.group}>
      <h3 className={styles.groupLabel}>{label}</h3>
      <ul className={styles.tags}>
        {items.map((item) => (
          <li key={item} className={tone === "topic" ? styles.topic : styles.genre}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
