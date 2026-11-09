import type { ReactNode } from "react";
import { mentorInitial } from "@/lib/mentors";
import styles from "./mentor-draft-review.module.css";

/**
 * The reviewed mentor card face: square portrait, name, optional price pill,
 * bio, then Teaching topics and Genres. The draft review and Private Sessions
 * both use this so the chips and portrait stay the same.
 * A price pill renders only when the caller passes one. This component does not
 * invent a rate.
 */
export function MentorCardFace({
  name,
  photoSrc,
  photoAlt,
  rateLabel,
  rateNote,
  bio,
  specialties,
  genres,
  roleLine,
  placeholder = false,
  instagramUrl,
  instagramLabel,
  edit,
}: {
  name: string;
  photoSrc: string | null;
  photoAlt: string;
  rateLabel?: string | null;
  /** Short note beside a price. The draft uses "provisional". */
  rateNote?: string | null;
  bio: string;
  specialties: readonly string[];
  genres: readonly string[];
  roleLine?: string | null;
  placeholder?: boolean;
  instagramUrl?: string | null;
  instagramLabel?: string | null;
  edit?: {
    name: ReactNode;
    roleLine: ReactNode;
    rate: ReactNode;
    bio: ReactNode;
    topics: ReactNode;
    genres: ReactNode;
    instagram: ReactNode;
  };
}) {
  const price = textOrNull(rateLabel);
  const note = textOrNull(rateNote);
  const instagramHref = textOrNull(instagramUrl);
  const instagramText = textOrNull(instagramLabel);
  const showMeta = Boolean(price || note || placeholder);
  return (
    <>
      <div className={styles.top}>
        {photoSrc ? (
          // Same 96px crop as the reviewed cards. photoSrc may be a local path or a teacher-entered URL.
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.photo} src={photoSrc} alt={photoAlt} width={96} height={96} />
        ) : (
          <span className={`${styles.photo} ${styles.initial}`} aria-hidden="true">
            {mentorInitial(name)}
          </span>
        )}
        <div className={styles.head}>
          <h2 className={styles.name}>{edit ? edit.name : name}</h2>
          {edit || roleLine ? <p className={styles.role}>{edit ? edit.roleLine : roleLine}</p> : null}
          {showMeta ? (
            <div>
              {edit ? edit.rate : price ? <span className={styles.price}>{price}</span> : null}
              {note ? <span className={styles.provisional}>{note}</span> : null}
              {placeholder ? <span className={styles.soon}>Coming soon</span> : null}
            </div>
          ) : null}
        </div>
      </div>
      {edit ? <div className={styles.bio}>{edit.bio}</div> : <p className={styles.bio}>{bio}</p>}
      {edit ? edit.topics : <TagGroup label="Teaching topics" items={specialties} tone="topic" />}
      {edit ? edit.genres : <TagGroup label="Genres" items={genres} tone="genre" />}
      {edit ? edit.instagram : instagramHref && instagramText ? (
        <p className={styles.meta}>
          <strong>Instagram:</strong>{" "}
          <a className={styles.link} href={instagramHref} target="_blank" rel="noopener noreferrer">
            {instagramText}
          </a>
        </p>
      ) : null}
    </>
  );
}

function textOrNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
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
  if (items.length === 0) return null;
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
