import Link from "next/link";
import { AcademyFigure } from "./photo";
import { groupSession } from "./photos";
import styles from "./home.module.css";

export function CommunitySection() {
  return (
    <section className={styles.section} aria-labelledby="community-heading">
      <h2 id="community-heading">Grow with people who are creating too.</h2>
      <p className={styles.lede}>
        Mentors are building their own music and projects. Artists, DJs, and producers help one another grow and create.
      </p>
      <div className={styles.action}>
        <Link className="pill pill-purple" href="/private-sessions">
          See Private Sessions
        </Link>
      </div>
      <div className={styles.wide}>
        <AcademyFigure photo={groupSession} />
      </div>
    </section>
  );
}
