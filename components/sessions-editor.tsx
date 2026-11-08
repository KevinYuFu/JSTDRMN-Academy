"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSessionsCopy } from "@/app/lead-copy-actions";
import { LeadEditFrame } from "./lead-edit";
import { MentorCardFace } from "./mentor-card-face";
import { MentorRoster, type MentorView } from "./mentor-roster";
import styles from "./program-editor.module.css";
import cardStyles from "./mentor-draft-review.module.css";

type Copy = { title: string; lede: string };
type Draft = MentorView & { specialtiesText: string; genresText: string };

function lines(items: string[]) {
  return items.join("\n");
}

function toDraft(mentor: MentorView): Draft {
  return { ...mentor, specialtiesText: lines(mentor.specialties), genresText: lines(mentor.genres) };
}

function Field({
  value,
  label,
  onChange,
  className,
}: {
  value: string;
  label: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <textarea
      className={className ? `${styles.box} ${className}` : styles.box}
      aria-label={label}
      value={value}
      rows={label === "Bio" || label === "Teaching topics" || label === "Genres" ? 3 : 1}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function SessionsBoard({
  lead,
  copy,
  mentors,
  courseId,
  viewer,
  openSlug,
  openForm,
  sent,
  error,
}: {
  lead: boolean;
  copy: Copy;
  mentors: MentorView[];
  courseId: string;
  viewer: { name: string; email: string } | null;
  openSlug: string | null;
  openForm: boolean;
  sent: boolean;
  error: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [draftCopy, setDraftCopy] = useState(copy);
  const [drafts, setDrafts] = useState<Draft[]>(() => mentors.map(toDraft));
  const [savedCopy, setSavedCopy] = useState(copy);
  const [savedMentors, setSavedMentors] = useState(mentors);

  function reset(nextCopy = savedCopy, nextMentors = savedMentors) {
    setDraftCopy(nextCopy);
    setDrafts(nextMentors.map(toDraft));
    setMessage(null);
  }

  const dirty =
    draftCopy.title !== savedCopy.title ||
    draftCopy.lede !== savedCopy.lede ||
    drafts.some((draft, index) => {
      const saved = savedMentors[index];
      if (!saved) return true;
      return (
        draft.name !== saved.name ||
        draft.roleLine !== saved.roleLine ||
        draft.bio !== saved.bio ||
        (draft.rateLabel ?? "") !== (saved.rateLabel ?? "") ||
        (draft.instagramLabel ?? "") !== (saved.instagramLabel ?? "") ||
        draft.specialtiesText !== lines(saved.specialties) ||
        draft.genresText !== lines(saved.genres)
      );
    });

  async function onSave() {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const result = await saveSessionsCopy({
        copy: draftCopy,
        mentors: {
          mentors: drafts.map((draft) => ({
            id: draft.id,
            name: draft.name,
            roleLine: draft.roleLine,
            bio: draft.bio,
            specialties: draft.specialtiesText,
            genres: draft.genresText,
            rateLabel: draft.rateLabel ?? "",
            instagramLabel: draft.instagramLabel ?? "",
          })),
        },
      });
      if (!result.ok) {
        setMessage(result.message);
        setSaving(false);
        return;
      }
      const nextMentors = drafts.map((draft) => ({
        ...draft,
        specialties: draft.specialtiesText.split("\n").map((item) => item.trim()).filter(Boolean),
        genres: draft.genresText.split("\n").map((item) => item.trim()).filter(Boolean),
        rateLabel: draft.rateLabel?.trim() ? draft.rateLabel.trim() : null,
        instagramLabel: draft.instagramLabel?.trim() ? draft.instagramLabel.trim() : null,
      }));
      setSavedCopy(draftCopy);
      setSavedMentors(nextMentors);
      setEditing(false);
      setMessage(null);
      setSaving(false);
      router.refresh();
    } catch {
      setMessage("Could not save. Try again.");
      setSaving(false);
    }
  }

  const hero = (
    <section className="sessions-hero">
      {editing ? (
        <>
          <h1>
            <Field className={styles.heroTitle} label="Title" value={draftCopy.title} onChange={(title) => setDraftCopy({ ...draftCopy, title })} />
          </h1>
          <p>
            <Field label="Short line" value={draftCopy.lede} onChange={(lede) => setDraftCopy({ ...draftCopy, lede })} />
          </p>
        </>
      ) : (
        <>
          <h1>{savedCopy.title}</h1>
          <p>{savedCopy.lede}</p>
        </>
      )}
    </section>
  );

  const body = (
    <>
      {hero}
      {sent ? <div className="banner shell-note">Request received. Staff can see it. Nothing is booked yet.</div> : null}
      {error ? <div className="error shell-note">Name, email, topic, and preferred times are all required.</div> : null}
      {editing ? (
        <div className={`${cardStyles.grid} ${cardStyles.liveGrid}`}>
          {drafts.map((draft, index) => (
            <article key={draft.id} className={`${cardStyles.card} ${cardStyles.liveCard}`} data-mentor={draft.slug}>
              <MentorCardFace
                name={draft.name}
                photoSrc={draft.photoUrl}
                photoAlt=""
                bio={draft.bio}
                specialties={draft.specialties}
                genres={draft.genres}
                roleLine={draft.roleLine}
                placeholder={draft.placeholder}
                rateLabel={draft.rateLabel}
                rateNote={draft.rateLabel?.trim() ? "provisional" : null}
                instagramUrl={draft.instagramUrl}
                instagramLabel={draft.instagramLabel}
                edit={{
                  name: <Field label="Name" value={draft.name} onChange={(name) => update(index, { name })} />,
                  roleLine: <Field label="Role" value={draft.roleLine} onChange={(roleLine) => update(index, { roleLine })} />,
                  rate: <Field label="Rate" value={draft.rateLabel ?? ""} onChange={(rateLabel) => update(index, { rateLabel })} />,
                  bio: <Field label="Bio" value={draft.bio} onChange={(bio) => update(index, { bio })} />,
                  topics: (
                    <div className={cardStyles.group}>
                      <h3 className={cardStyles.groupLabel}>Teaching topics</h3>
                      <Field label="Teaching topics" value={draft.specialtiesText} onChange={(specialtiesText) => update(index, { specialtiesText })} />
                    </div>
                  ),
                  genres: (
                    <div className={cardStyles.group}>
                      <h3 className={cardStyles.groupLabel}>Genres</h3>
                      <Field label="Genres" value={draft.genresText} onChange={(genresText) => update(index, { genresText })} />
                    </div>
                  ),
                  instagram: draft.instagramUrl ? (
                    <p className={cardStyles.meta}>
                      <strong>Instagram:</strong>{" "}
                      <Field label="Instagram" value={draft.instagramLabel ?? ""} onChange={(instagramLabel) => update(index, { instagramLabel })} />
                    </p>
                  ) : null,
                }}
              />
            </article>
          ))}
        </div>
      ) : (
        <MentorRoster courseId={courseId} viewer={viewer} openSlug={openSlug} openForm={openForm} mentors={savedMentors} />
      )}
    </>
  );

  function update(index: number, patch: Partial<Draft>) {
    setDrafts((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  const page = <main className="sessions-page">{body}</main>;
  if (!lead) return page;

  return (
    <LeadEditFrame
      editing={editing}
      saving={saving}
      dirty={dirty}
      message={message}
      onEdit={() => {
        reset();
        setEditing(true);
      }}
      onCancel={() => {
        reset();
        setEditing(false);
      }}
      onSave={() => void onSave()}
    >
      {page}
    </LeadEditFrame>
  );
}
