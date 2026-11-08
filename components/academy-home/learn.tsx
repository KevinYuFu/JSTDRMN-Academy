import { AcademyFigure } from "./photo";
import { djLandscape, djPortrait } from "./photos";
import styles from "./home.module.css";

export function LearnIntro() {
  return (
    <section className={styles.section} aria-labelledby="learn-heading">
      <h2 id="learn-heading">Find your way to learn.</h2>
      <p className={styles.lede}>
        Online and in-person courses, including local Toronto producers. Tutorials cover different music-production
        skills.
      </p>
      <div className={styles.pair}>
        <AcademyFigure photo={djLandscape} />
        <AcademyFigure photo={djPortrait} />
      </div>
    </section>
  );
}
