"use client";

import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Icon } from "./icons";

export function SlidesCard({ title, meta, src }: { title: string; meta: string | null; src: string }) {
  return (
    <Dialog>
      <DialogTrigger className="card slides slides-open">
        <span className="ico">
          <Icon name="slides" />
        </span>
        <span className="meta">
          <span className="slides-title">{title}</span>
          {meta ? <span className="slides-meta">{meta}</span> : null}
        </span>
      </DialogTrigger>
      <DialogContent className="slides-dialog flex h-[min(92vh,860px)] w-[min(1100px,calc(100%-1.5rem))] max-w-none flex-col overflow-hidden p-0">
        <div className="slides-dialog-bar">
          <DialogTitle>{title}</DialogTitle>
          <DialogClose className="slides-close" aria-label="Close">
            <Icon name="close" />
          </DialogClose>
        </div>
        <DialogDescription className="sr-only">Lesson slides. Close with Escape.</DialogDescription>
        <iframe src={`${src}#toolbar=0&navpanes=0`} title={title} />
      </DialogContent>
    </Dialog>
  );
}
