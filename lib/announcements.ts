export type QueueRow = {
  id: string;
  status: string;
  sendAt: Date;
};

export function dueAnnouncements(rows: QueueRow[], now: Date) {
  return rows.filter((row) => row.status === "scheduled" && row.sendAt.getTime() <= now.getTime());
}

export function announcementWhen(eventStart: Date | null, leadMinutes: number | null, explicit: Date | null) {
  if (eventStart && leadMinutes != null) {
    return new Date(eventStart.getTime() - leadMinutes * 60 * 1000);
  }
  return explicit;
}

export function announcementContent(body: string, roleMention: string | null) {
  const mention = roleMention?.trim() ?? "";
  if (!mention) return body;
  if (/^\d{17,20}$/.test(mention)) return `<@&${mention}> ${body}`;
  const label = mention.startsWith("@") ? mention : `@${mention}`;
  return `${label} ${body}`;
}
