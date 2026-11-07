"use client";

import styles from "./nav-pending.module.css";

export function NavPending({ label }: { label: string }) {
  return (
    <>
      <span className={styles.bar} data-nav-pending={label} aria-hidden="true" />
      <span className={styles.live} role="status">
        Loading {label}
      </span>
    </>
  );
}
