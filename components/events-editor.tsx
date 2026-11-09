"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveEventsCopy } from "@/app/lead-copy-actions";
import { LeadEditFrame } from "./lead-edit";
import { EventJoin } from "./event-join";
import styles from "./program-editor.module.css";

export type EventCard = {
  id: string;
  slug: string;
  featured: boolean;
  kicker: string;
  title: string;
  when: string;
  description: string;
  audience: string;
  join: { type: "link" | "calendar"; url: string; label: string; discord: boolean };
  linked: boolean;
  signedIn: boolean;
};

type Copy = { title: string; lede: string };

function Field({
  value,
  label,
  onChange,
  rows = 1,
  className,
}: {
  value: string;
  label: string;
  onChange: (value: string) => void;
  rows?: number;
  className?: string;
}) {
  return (
    <textarea
      className={className ? `${styles.box} ${className}` : styles.box}
      aria-label={label}
      rows={rows}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function EventsBoard({
  lead,
  copy,
  events,
  sentDiscord,
}: {
  lead: boolean;
  copy: Copy;
  events: EventCard[];
  sentDiscord: "connected" | "unconfigured" | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [draftCopy, setDraftCopy] = useState(copy);
  const [drafts, setDrafts] = useState(events);
  const [savedCopy, setSavedCopy] = useState(copy);
  const [savedEvents, setSavedEvents] = useState(events);
  const featured = savedEvents.find((event) => event.featured) ?? savedEvents[0];
  const rest = savedEvents.filter((event) => event !== featured);
  const editFeatured = drafts.find((event) => event.id === featured?.id);
  const editRest = drafts.filter((event) => event.id !== featured?.id);

  const dirty =
    draftCopy.title !== savedCopy.title ||
    draftCopy.lede !== savedCopy.lede ||
    drafts.some((draft) => {
      const saved = savedEvents.find((event) => event.id === draft.id);
      return !saved || draft.title !== saved.title || draft.description !== saved.description;
    });

  function reset() {
    setDraftCopy(savedCopy);
    setDrafts(savedEvents);
    setMessage(null);
  }

  async function onSave() {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const result = await saveEventsCopy({
        copy: draftCopy,
        events: { events: drafts.map((event) => ({ id: event.id, title: event.title, description: event.description })) },
      });
      if (!result.ok) {
        setMessage(result.message);
        setSaving(false);
        return;
      }
      setSavedCopy(draftCopy);
      setSavedEvents(drafts);
      setEditing(false);
      setMessage(null);
      setSaving(false);
      router.refresh();
    } catch {
      setMessage("Could not save. Try again.");
      setSaving(false);
    }
  }

  function update(id: string, patch: Partial<EventCard>) {
    setDrafts((current) => current.map((event) => (event.id === id ? { ...event, ...patch } : event)));
  }

  function article(event: EventCard, draft: EventCard | undefined, featuredCard: boolean) {
    const Title = featuredCard ? "h2" : "h3";
    return (
      <article key={event.id} className={featuredCard ? "event-feature" : "event-card"} data-event={event.slug}>
        <div className="kicker">{event.kicker}</div>
        <Title>
          {editing && draft ? (
            <Field label="Title" value={draft.title} onChange={(title) => update(event.id, { title })} />
          ) : (
            event.title
          )}
        </Title>
        <p className="event-when">{event.when}</p>
        <p>
          {editing && draft ? (
            <Field label="Description" rows={3} value={draft.description} onChange={(description) => update(event.id, { description })} />
          ) : (
            event.description
          )}
        </p>
        <p className="note">{event.audience}</p>
        <EventJoin action={event.join} slug={event.slug} linked={event.linked} signedIn={event.signedIn} />
      </article>
    );
  }

  const shown = editing ? drafts : savedEvents;
  const shownFeatured = shown.find((event) => event.id === (featured?.id ?? shown[0]?.id));
  const shownRest = shown.filter((event) => event.id !== shownFeatured?.id);
  const body = (
    <>
      <section className="sessions-hero">
        {editing ? (
          <>
            <h1>
              <Field className={styles.heroTitle} label="Title" value={draftCopy.title} onChange={(title) => setDraftCopy({ ...draftCopy, title })} />
            </h1>
            <p>
              <Field className={`${styles.heroTitle} ${styles.heroLine}`} label="Short line" value={draftCopy.lede} onChange={(lede) => setDraftCopy({ ...draftCopy, lede })} />
            </p>
          </>
        ) : (
          <>
            <h1>{savedCopy.title}</h1>
            <p>{savedCopy.lede}</p>
          </>
        )}
      </section>
      {sentDiscord === "connected" ? <div className="banner shell-note">Discord is connected.</div> : null}
      {sentDiscord === "unconfigured" ? <div className="banner shell-note">Discord linking isn’t configured yet.</div> : null}
      {shownFeatured ? article(editing ? (editFeatured ?? shownFeatured) : shownFeatured, editing ? editFeatured : undefined, true) : (
        <p className="note">No upcoming events for this account.</p>
      )}
      {(editing ? editRest : shownRest).length > 0 ? (
        <div className="event-grid">
          {(editing ? editRest : shownRest).map((event) => article(event, drafts.find((item) => item.id === event.id), false))}
        </div>
      ) : null}
    </>
  );

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
