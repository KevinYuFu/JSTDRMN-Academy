import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { announcementContent, announcementWhen, dueAnnouncements } from "./announcements";
import type { EntitlementRecord } from "./entitlements";
import {
  canSeeEvent,
  eventIcs,
  formatTorontoInput,
  isDiscordDestination,
  joinGate,
  nextOccurrence,
  parseToronto,
  resolveJoin,
} from "./events";

const now = new Date("2026-10-19T22:00:00Z");

function grant(overrides: Partial<EntitlementRecord> = {}): EntitlementRecord {
  return {
    product: "cohort",
    courseId: "crs_dj",
    cohortId: "coh_dj6",
    status: "active",
    endsAt: null,
    ...overrides,
  };
}

const base = {
  cohortId: null as string | null,
  active: true,
  cancelled: false,
  role: "student",
  entitlements: [] as EntitlementRecord[],
  producerCourseIds: ["crs_prod"],
  now,
};

describe("event audience", () => {
  it("shows everyone events to a student and hides the other audiences", () => {
    assert.equal(canSeeEvent({ ...base, audience: "all" }), true);
    assert.equal(canSeeEvent({ ...base, audience: "headliners" }), false);
    assert.equal(canSeeEvent({ ...base, audience: "producers" }), false);
    assert.equal(canSeeEvent({ ...base, audience: "cohort", cohortId: "coh_dj6" }), false);
    assert.equal(canSeeEvent({ ...base, audience: "all", cancelled: true }), false);
  });

  it("opens Headliner, cohort, and producer events only for that seat", () => {
    assert.equal(
      canSeeEvent({ ...base, audience: "headliners", entitlements: [grant({ product: "headliner", courseId: null, cohortId: null })] }),
      true,
    );
    assert.equal(canSeeEvent({ ...base, audience: "cohort", cohortId: "coh_dj6", entitlements: [grant()] }), true);
    assert.equal(canSeeEvent({ ...base, audience: "cohort", cohortId: "coh_dj5", entitlements: [grant()] }), false);
    assert.equal(
      canSeeEvent({
        ...base,
        audience: "producers",
        entitlements: [grant({ product: "cohort", courseId: "crs_prod", cohortId: "coh_prod" })],
      }),
      true,
    );
    assert.equal(canSeeEvent({ ...base, audience: "producers", role: "teacher" }), true);
  });
});

describe("join actions", () => {
  const discordType = { actionType: "link", actionUrl: "https://discord.com/channels/jstdrmn/community", buttonLabel: "Join" };
  const zoomType = { actionType: "link", actionUrl: "https://zoom.us/j/jstdrmn-green-room", buttonLabel: "Join Zoom" };
  const calendarType = { actionType: "calendar", actionUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE", buttonLabel: "Add to calendar" };

  it("inherits the type action and only gates Discord destinations", () => {
    const discord = resolveJoin({ actionType: null, actionUrl: null, buttonLabel: null }, discordType);
    const zoom = resolveJoin({ actionType: null, actionUrl: null, buttonLabel: null }, zoomType);
    const calendar = resolveJoin({ actionType: null, actionUrl: null, buttonLabel: null }, calendarType);
    assert.equal(discord.discord, true);
    assert.equal(joinGate(discord, false), "connect");
    assert.equal(joinGate(discord, true), "open");
    assert.equal(zoom.discord, false);
    assert.equal(joinGate(zoom, false), "open");
    assert.equal(calendar.type, "calendar");
    assert.equal(joinGate(calendar, false), "open");
    assert.equal(isDiscordDestination("https://discord.gg/jstdrmn"), true);
    assert.equal(isDiscordDestination("https://instagram.com/jstdrmn"), false);
  });

  it("lets an event override the type default", () => {
    const action = resolveJoin(
      { actionType: "link", actionUrl: "https://instagram.com/jstdrmn", buttonLabel: "Open Instagram" },
      discordType,
    );
    assert.equal(action.label, "Open Instagram");
    assert.equal(action.discord, false);
    assert.equal(joinGate(action, false), "open");
  });
});

describe("schedule", () => {
  it("keeps a weekly series on the next Thursday in Toronto", () => {
    const start = parseToronto("2026-10-15T19:00");
    const end = parseToronto("2026-10-15T20:00");
    assert.ok(start && end);
    assert.equal(start.toISOString(), "2026-10-15T23:00:00.000Z");
    const next = nextOccurrence(start, end, "weekly", now);
    assert.equal(next?.start.toISOString(), "2026-10-22T23:00:00.000Z");
    assert.equal(formatTorontoInput(next!.start), "2026-10-22T19:00");
    assert.equal(nextOccurrence(start, end, "", now), null);
  });

  it("builds an ics file and a due announcement queue", () => {
    const ics = eventIcs({
      slug: "sync",
      title: "Sync",
      description: "Bring a loop.",
      start: new Date("2026-10-20T20:00:00Z"),
      end: new Date("2026-10-20T21:00:00Z"),
      recurrence: "",
      url: "https://calendar.google.com/calendar/render?action=TEMPLATE",
    });
    assert.match(ics, /SUMMARY:Sync/);
    assert.match(ics, /DTSTART:20261020T200000Z/);
    const sendAt = announcementWhen(new Date("2026-10-21T22:00:00Z"), 30, null);
    assert.equal(sendAt?.toISOString(), "2026-10-21T21:30:00.000Z");
    const due = dueAnnouncements(
      [
        { id: "a", status: "scheduled", sendAt: new Date("2026-10-19T21:00:00Z") },
        { id: "b", status: "scheduled", sendAt: new Date("2026-10-19T23:00:00Z") },
        { id: "c", status: "sent", sendAt: new Date("2026-10-19T21:00:00Z") },
      ],
      now,
    );
    assert.deepEqual(due.map((row) => row.id), ["a"]);
    assert.equal(announcementContent("Doors are open.", "Producers"), "@Producers Doors are open.");
  });
});
