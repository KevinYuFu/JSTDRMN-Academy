import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { leadGate, staffGate } from "./access-rules";
import { eventCohortOptions } from "./staff-copy";
import { makeStaffData } from "./staff-data";
import { withSample } from "./static-params";

type Deps = Parameters<typeof makeStaffData>[0];
type User = { id: string; name: string; role: string };

function redirectTo(href: string): never {
  throw new Error(`NEXT_REDIRECT ${href}`);
}

function staffFor(user: User | null): Deps["requireStaff"] {
  return async () => {
    if (!user) redirectTo("/login");
    const gate = staffGate(user.role);
    if (gate) redirectTo(gate.redirect);
    return user;
  };
}

function leadFor(user: User | null): Deps["requireLead"] {
  return async () => {
    if (!user) redirectTo("/login");
    const gate = leadGate(user.role);
    if (gate) redirectTo(gate.redirect);
    return user;
  };
}

function quietDb() {
  let reads = 0;
  const findMany = async () => {
    reads += 1;
    return [];
  };
  const db = {
    comment: { findMany },
    user: { findMany },
    hubspotLog: { findMany },
    sessionRequest: { findMany },
    entitlement: { findMany },
    pendingGrant: { findMany },
    announcement: { findMany },
  } as unknown as Deps["db"];
  return { db, reads: () => reads };
}

function quietContent(overrides: Record<string, unknown> = {}): Deps["content"] {
  const fail = async () => {
    throw new Error("unexpected content read");
  };
  return {
    loadCourseCatalog: fail,
    loadCohortsWithCourses: fail,
    listMentors: fail,
    listCourses: fail,
    listManagedEvents: fail,
    listEventTypes: fail,
    eventBySlug: fail,
    mentorBySlug: fail,
    courseBySlug: fail,
    lessonsForCourse: fail,
    tracksForCourse: fail,
    loadSkillTree: fail,
    ...overrides,
  } as unknown as Deps["content"];
}

const student: User = { id: "usr_student", name: "Sam Student", role: "student" };
const mentor: User = { id: "usr_mentor", name: "Mia Mentor", role: "mentor" };
const lead: User = { id: "usr_lead", name: "Yu", role: "lead" };

describe("staff data", () => {
  it("throws a redirect for a non-staff user before any read", async () => {
    const store = quietDb();
    let contentReads = 0;
    const data = makeStaffData({
      requireStaff: staffFor(student),
      requireLead: leadFor(student),
      db: store.db,
      content: quietContent({
        loadSkillTree: async () => {
          contentReads += 1;
          return { id: "root", title: "Map", summary: "", children: [] };
        },
      }),
    });

    await assert.rejects(() => data.staffDashboard(), /NEXT_REDIRECT \//);
    await assert.rejects(() => data.accessPageData(), /NEXT_REDIRECT \//);
    await assert.rejects(() => data.announcementsData(), /NEXT_REDIRECT \//);
    await assert.rejects(() => data.eventManagerData(), /NEXT_REDIRECT \//);
    await assert.rejects(() => data.eventFormData("sync"), /NEXT_REDIRECT \//);
    await assert.rejects(() => data.mentorForEdit("yuzu"), /NEXT_REDIRECT \//);
    await assert.rejects(() => data.courseEditorData("dj-bootcamp"), /NEXT_REDIRECT \//);
    await assert.rejects(() => data.skillTreeForEditor(), /NEXT_REDIRECT \//);
    assert.equal(store.reads(), 0);
    assert.equal(contentReads, 0);
  });

  it("sends a mentor away from the skill tree before loading it", async () => {
    let loaded = 0;
    const data = makeStaffData({
      requireStaff: staffFor(mentor),
      requireLead: leadFor(mentor),
      db: quietDb().db,
      content: quietContent({
        loadSkillTree: async () => {
          loaded += 1;
          return { id: "root", title: "Map", summary: "", children: [] };
        },
      }),
    });
    await assert.rejects(() => data.skillTreeForEditor(), /NEXT_REDIRECT \/teacher\?skillTree=forbidden/);
    assert.equal(loaded, 0);
  });

  it("returns the fake dashboard rows for a staff user", async () => {
    const comments = [{ id: "cmt_1" }];
    let commentArgs: object | undefined;
    const data = makeStaffData({
      requireStaff: staffFor(lead),
      requireLead: leadFor(lead),
      db: {
        ...quietDb().db,
        comment: {
          findMany: async (args: object | undefined) => {
            commentArgs = args;
            return comments;
          },
        },
      } as unknown as Deps["db"],
      content: quietContent({
        loadCourseCatalog: async () => [],
        loadCohortsWithCourses: async () => [],
        listMentors: async () => [],
      }),
    });
    const dashboard = await data.staffDashboard();
    assert.equal(dashboard.staff.name, "Yu");
    assert.equal(dashboard.comments, comments);
    assert.equal(dashboard.catalog.length, 0);
    assert.deepEqual(commentArgs, {
      where: { parentId: null },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: true, lesson: { include: { course: true, cohort: true } }, replies: { include: { user: true } } },
    });
  });

  it("loads the skill tree for a Lead and maps event cohorts", async () => {
    const tree = { id: "root", title: "Map", summary: "", children: [] };
    const data = makeStaffData({
      requireStaff: staffFor(lead),
      requireLead: leadFor(lead),
      db: quietDb().db,
      content: quietContent({
        loadSkillTree: async () => tree,
        listEventTypes: async () => [{ id: "evt_sync", name: "Sync" }],
        loadCohortsWithCourses: async () => [
          { id: "coh_dj5", name: "Cohort 5", course: { title: "DJ Bootcamp" } },
        ],
        eventBySlug: async (slug: string) => ({ id: "ev_1", slug, title: "Sync night" }),
      }),
    });
    assert.equal(await data.skillTreeForEditor(), tree);
    const form = await data.eventFormData("sync");
    assert.equal(form.event?.title, "Sync night");
    assert.deepEqual(form.cohorts, [{ id: "coh_dj5", name: "Cohort 5", course: "DJ Bootcamp" }]);
    assert.deepEqual(eventCohortOptions([]), []);
  });
});

describe("withSample", () => {
  it("keeps a real list and fills an empty one with the sample", () => {
    const params = [{ slug: "dj-bootcamp" }];
    const sample = { slug: "_" };
    assert.equal(withSample(params, sample), params);
    assert.deepEqual(withSample([], sample), [sample]);
    assert.deepEqual(withSample([], { slug: "_", cohort: "_" }), [{ slug: "_", cohort: "_" }]);
  });
});
