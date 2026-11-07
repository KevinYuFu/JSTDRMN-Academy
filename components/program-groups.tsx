import type { ReactNode } from "react";
import styles from "./program-groups.module.css";

export function ProgramGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.group}>
      <h3 className={styles.heading}>{title}</h3>
      <div className="program-grid">{children}</div>
    </div>
  );
}
