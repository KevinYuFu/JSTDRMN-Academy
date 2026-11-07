import { MENTOR_DRAFT_RATE_LABEL, MENTOR_DRAFTS } from "@/lib/mentor-drafts";
import { MentorCardFace } from "./mentor-card-face";
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
              <MentorCardFace
                name={mentor.name}
                photoSrc={mentor.portraitSrc}
                photoAlt={mentor.portraitAlt}
                rateLabel={MENTOR_DRAFT_RATE_LABEL}
                rateNote="provisional"
                bio={mentor.bio}
                specialties={mentor.specialties}
                genres={mentor.genres}
              />
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
