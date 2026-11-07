import styles from "./video-unavailable.module.css";

/** Shown in place of a player when a course has no lesson videos yet. */
export function VideoUnavailable() {
  return (
    <div className={styles.slot} role="status">
      Video not available yet
    </div>
  );
}
