import Link from "next/link";
import { skillTreeNav } from "@/lib/skill-tree";
import { AcademyFigure } from "./photo";
import { welcomeStudio } from "./photos";
import styles from "./home.module.css";

export function WelcomeHero() {
  return (
    <section className={styles.hero} aria-labelledby="welcome-heading">
      <div className={styles.frame}>
        <div className={styles.copy}>
          <h1 id="welcome-heading">Welcome to JSTDRMN Academy.</h1>
          <p className={styles.lede}>Find your next step in music production or DJing.</p>
          <div className={styles.action}>
            <Link className="pill pill-purple" href={skillTreeNav.href}>
              Explore the Skill Tree
            </Link>
          </div>
        </div>
        <AcademyFigure photo={welcomeStudio} priority />
      </div>
    </section>
  );
}
