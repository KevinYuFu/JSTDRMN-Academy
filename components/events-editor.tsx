"use client";

import type { EventsCopyInput } from "@/lib/event-copy";
import type { SaveResult } from "@/lib/inline-edit";
import { EventJoin } from "./event-join";
import { LeadEditFrame } from "./lead-edit";
import styles from "./program-editor.module.css";
import { useInlineEdit } from "./use-inline-edit";

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
type EventsDraft = { copy: Copy; events: EventCard[] };

function eventsDirty(draft: EventsDraft, saved: EventsDraft) {
  return (
    draft.copy.title !== saved.copy.title ||
    draft.copy.lede !== saved.copy.lede ||
    draft.events.some((item) => {
      const previous = saved.events.find((event) => event.id === item.id);
      return !previous || item.title !== previous.title || item.description !== previous.description;
    })
  );
}

function eventsInput(draft: EventsDraft): EventsCopyInput {
  return {
    copy: draft.copy,
    events: {
      events: draft.events.map((event) => ({ id: event.id, title: event.title, description: event.description })),
    },
  };
}

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
  save,
}: {
  lead: boolean;
  copy: Copy;
  events: EventCard[];
  sentDiscord: "connected" | "unconfigured" | null;
  save: (input: EventsCopyInput) => Promise<SaveResult>;
}) {
  const edit = useInlineEdit<EventsDraft, EventsCopyInput>({
    initial: { copy, events },
    save,
    toInput: eventsInput,
    isDirty: eventsDirty,
  });
  const { editing } = edit;
  const draftCopy = edit.draft.copy;
  const drafts = edit.draft.events;
  const savedCopy = edit.saved.copy;
  const savedEvents = edit.saved.events;
  const featured = savedEvents.find((event) => event.featured) ?? savedEvents[0];
  const editFeatured = drafts.find((event) => event.id === featured?.id);
  const editRest = drafts.filter((event) => event.id !== featured?.id);

  function update(id: string, patch: Partial<EventCard>) {
    edit.change((current) => ({
      ...current,
      events: current.events.map((event) => (event.id === id ? { ...event, ...patch } : event)),
    }));
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
              <Field
                className={styles.heroTitle}
                label="Title"
                value={draftCopy.title}
                onChange={(title) => edit.change((current) => ({ ...current, copy: { ...current.copy, title } }))}
              />
            </h1>
            <p>
              <Field
                className={`${styles.heroTitle} ${styles.heroLine}`}
                label="Short line"
                value={draftCopy.lede}
                onChange={(lede) => edit.change((current) => ({ ...current, copy: { ...current.copy, lede } }))}
              />
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
  return <LeadEditFrame {...edit.frame}>{page}</LeadEditFrame>;
}
