import type { ReactNode } from "react";
import styles from "./program-groups.module.css";

export function ProgramGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.group}>
      <h2 className={styles.heading}>{title}</h2>
      <div className={styles.grid}>{children}</div>
    </div>
  );
}
