import { programBadges } from "@/lib/program-labels";
import styles from "./program-badges.module.css";

export function ProgramBadges({
  delivery,
  setting,
  access,
}: {
  delivery: string;
  setting: string;
  access: string;
}) {
  const badges = programBadges({ delivery, setting, access });
  if (badges.length === 0) return null;
  return (
    <ul className={styles.badges} aria-label="Program type">
      {badges.map((badge) => (
        <li key={badge} className={styles.badge}>
          {badge}
        </li>
      ))}
    </ul>
  );
}

export function SubscriptionNote() {
  return <div className={styles.included}>One subscription includes all intro courses.</div>;
}
