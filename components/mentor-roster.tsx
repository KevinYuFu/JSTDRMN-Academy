"use client";

import { useState } from "react";
import { requestSession } from "@/app/actions";
import { mentorInitial } from "@/lib/mentors";
import { Icon } from "./icons";
import { Button } from "./ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

export type MentorView = {
  id: string;
  slug: string;
  name: string;
  roleLine: string;
  photoUrl: string | null;
  bio: string;
  background: string[];
  specialties: string[];
  genres: string[];
  placeholder: boolean;
};

export function MentorRoster({
  mentors,
  courseId,
  viewer,
  openSlug,
  openForm,
}: {
  mentors: MentorView[];
  courseId: string;
  viewer: { name: string; email: string } | null;
  openSlug: string | null;
  openForm: boolean;
}) {
  const initial = mentors.find((mentor) => mentor.slug === openSlug) ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(initial?.id ?? null);
  const [mode, setMode] = useState<"profile" | "form">(openForm ? "form" : "profile");
  const selected = mentors.find((mentor) => mentor.id === selectedId) ?? null;

  function openMentor(mentor: MentorView) {
    setSelectedId(mentor.id);
    setMode("profile");
  }

  function close() {
    setSelectedId(null);
    setMode("profile");
  }

  return (
    <>
      {mentors.length === 0 ? <p className="note">Mentors will be listed here.</p> : null}
      <div className="mentor-grid">
        {mentors.map((mentor) => (
          <button key={mentor.id} type="button" className="mentor-card" onClick={() => openMentor(mentor)}>
            <Avatar mentor={mentor} />
            <span className="mentor-name">{mentor.name}</span>
            <span className="mentor-role">{mentor.roleLine}</span>
            <span className="mentor-tags">
              {mentor.placeholder ? <span className="tag">Coming soon</span> : null}
              {mentor.genres.map((genre) => (
                <span key={genre} className="tag">{genre}</span>
              ))}
            </span>
          </button>
        ))}
      </div>
      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) close(); }}>
        {selected ? (
          <DialogContent className="mentor-dialog max-h-[min(90vh,760px)] w-[min(640px,calc(100%-1.5rem))] overflow-y-auto p-0">
            <div className="slides-dialog-bar">
              <DialogTitle>{mode === "form" ? `Request a session with ${selected.name}` : selected.name}</DialogTitle>
              <DialogClose className="slides-close" aria-label="Close">
                <Icon name="close" />
              </DialogClose>
            </div>
            <DialogDescription className="sr-only">{selected.roleLine}. Close with Escape.</DialogDescription>
            <div className="mentor-panel">
              {mode === "profile" ? (
                <>
                  <div className="mentor-panel-head">
                    <Avatar mentor={selected} />
                    <div>
                      <p className="mentor-role">{selected.roleLine}</p>
                      <div className="mentor-tags">
                        {selected.placeholder ? <span className="tag">Coming soon</span> : null}
                        {selected.genres.map((genre) => (
                          <span key={genre} className="tag">{genre}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p>{selected.bio}</p>
                  {selected.background.length > 0 ? (
                    <>
                      <h3>Background</h3>
                      <ul>
                        {selected.background.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  {selected.specialties.length > 0 ? (
                    <>
                      <h3>Specialties</h3>
                      <ul>
                        {selected.specialties.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  {selected.placeholder ? (
                    <p className="note">Coming soon. This profile is a placeholder.</p>
                  ) : (
                    <Button type="button" onClick={() => setMode("form")}>Request a session</Button>
                  )}
                </>
              ) : (
                <form action={requestSession} className="stack">
                  <input type="hidden" name="courseId" value={courseId} />
                  <input type="hidden" name="mentorId" value={selected.id} />
                  <p className="note">With {selected.name}. Scheduling and payment come later.</p>
                  <div className="field">
                    <Label htmlFor="session-name">Name</Label>
                    <Input id="session-name" name="name" required minLength={2} maxLength={80} defaultValue={viewer?.name ?? ""} autoComplete="name" />
                  </div>
                  <div className="field">
                    <Label htmlFor="session-email">Email</Label>
                    <Input id="session-email" name="email" type="email" required maxLength={120} defaultValue={viewer?.email ?? ""} autoComplete="email" />
                  </div>
                  <div className="field">
                    <Label htmlFor="session-topic">Topic</Label>
                    <Textarea id="session-topic" name="topic" required minLength={2} maxLength={500} placeholder="What do you want to work on?" />
                  </div>
                  <div className="field">
                    <Label htmlFor="session-times">Preferred times</Label>
                    <Textarea id="session-times" name="preferredTimes" required minLength={2} maxLength={500} placeholder="Days and times that work for you" />
                  </div>
                  <div className="detail-actions">
                    <Button type="submit">Send request</Button>
                    <Button type="button" variant="black" onClick={() => setMode("profile")}>Back</Button>
                  </div>
                </form>
              )}
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}

function Avatar({ mentor }: { mentor: MentorView }) {
  if (mentor.photoUrl) {
    return <span className="mentor-avatar has-photo" style={{ backgroundImage: `url(${mentor.photoUrl})` }} role="img" aria-label="" />;
  }
  return <span className="mentor-avatar" aria-hidden="true">{mentorInitial(mentor.name)}</span>;
}
