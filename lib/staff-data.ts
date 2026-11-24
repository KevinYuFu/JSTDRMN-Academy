import "server-only";
import type { HubspotLog, PendingGrant, Prisma, User } from "@prisma/client";
import { requireLead, requireStaff } from "./auth";
import {
  courseBySlug,
  eventBySlug,
  lessonsForCourse,
  listCourses,
  listEventTypes,
  listManagedEvents,
  listMentors,
  loadCohortsWithCourses,
  loadCourseCatalog,
  loadSkillTree,
  mentorBySlug,
  tracksForCourse,
} from "./content";
import { prisma } from "./db";
import { eventCohortOptions } from "./staff-copy";

type StaffUser = { id: string; name: string; role: string };

type Read = (args?: object) => Promise<unknown[]>;

type StaffDb = {
  comment: { findMany: Read };
  user: { findMany: Read };
  hubspotLog: { findMany: Read };
  sessionRequest: { findMany: Read };
  entitlement: { findMany: Read };
  pendingGrant: { findMany: Read };
  announcement: { findMany: Read };
};

type Content = Pick<
  typeof import("./content"),
  | "loadCourseCatalog"
  | "loadCohortsWithCourses"
  | "listMentors"
  | "listCourses"
  | "listManagedEvents"
  | "listEventTypes"
  | "eventBySlug"
  | "mentorBySlug"
  | "courseBySlug"
  | "lessonsForCourse"
  | "tracksForCourse"
  | "loadSkillTree"
>;

const commentQuery = {
  where: { parentId: null },
  orderBy: { createdAt: "desc" },
  take: 6,
  include: { user: true, lesson: { include: { course: true, cohort: true } }, replies: { include: { user: true } } },
} satisfies Prisma.CommentFindManyArgs;

const peopleQuery = {
  orderBy: { name: "asc" },
  select: { id: true, name: true, email: true, role: true, discordId: true, discordUsername: true },
} satisfies Prisma.UserFindManyArgs;

const logQuery = { orderBy: { createdAt: "desc" }, take: 4 } satisfies Prisma.HubspotLogFindManyArgs;

const requestQuery = {
  orderBy: { createdAt: "desc" },
  take: 8,
  include: { course: true, mentor: true },
} satisfies Prisma.SessionRequestFindManyArgs;

const entitlementQuery = {
  where: { status: "active" },
  include: { user: true, course: true, cohort: true },
  orderBy: { createdAt: "desc" },
} satisfies Prisma.EntitlementFindManyArgs;

const pendingQuery = {
  where: { consumedAt: null },
  orderBy: { createdAt: "desc" },
} satisfies Prisma.PendingGrantFindManyArgs;

const studentQuery = { where: { role: "student" }, orderBy: { name: "asc" } } satisfies Prisma.UserFindManyArgs;

const announcementQuery = {
  include: { event: true },
  orderBy: { sendAt: "asc" },
} satisfies Prisma.AnnouncementFindManyArgs;

type DashboardComment = Prisma.CommentGetPayload<typeof commentQuery>;
type DashboardPerson = Prisma.UserGetPayload<typeof peopleQuery>;
type HubspotRow = HubspotLog;
type RequestRow = Prisma.SessionRequestGetPayload<typeof requestQuery>;
type EntitlementRow = Prisma.EntitlementGetPayload<typeof entitlementQuery>;
type PendingRow = PendingGrant;
type StudentRow = User;
type AnnouncementRow = Prisma.AnnouncementGetPayload<typeof announcementQuery>;

/**
 * Staff reads. Pass a fake user and database from tests.
 * Each function starts with the staff check. getUser is request-cached, so the check is free
 * when the page or the breadcrumb already asked.
 */
export function makeStaffData({
  requireStaff: allowStaff,
  requireLead: allowLead,
  db,
  content,
}: {
  requireStaff: () => Promise<StaffUser>;
  requireLead: () => Promise<StaffUser>;
  db: StaffDb;
  content: Content;
}) {
  return {
    async staffDashboard() {
      const staff = await allowStaff();
      const [catalog, comments, people, logs, cohorts, requests, mentors] = await Promise.all([
        content.loadCourseCatalog(),
        db.comment.findMany(commentQuery) as Promise<DashboardComment[]>,
        db.user.findMany(peopleQuery) as Promise<DashboardPerson[]>,
        db.hubspotLog.findMany(logQuery) as Promise<HubspotRow[]>,
        content.loadCohortsWithCourses(),
        db.sessionRequest.findMany(requestQuery) as Promise<RequestRow[]>,
        content.listMentors(),
      ]);
      return { staff, catalog, comments, people, logs, cohorts, requests, mentors };
    },

    async accessPageData() {
      await allowStaff();
      const [courses, cohorts, entitlements, pending, students] = await Promise.all([
        content.listCourses(),
        content.loadCohortsWithCourses(),
        db.entitlement.findMany(entitlementQuery) as Promise<EntitlementRow[]>,
        db.pendingGrant.findMany(pendingQuery) as Promise<PendingRow[]>,
        db.user.findMany(studentQuery) as Promise<StudentRow[]>,
      ]);
      return { courses, cohorts, entitlements, pending, students };
    },

    async announcementsData() {
      await allowStaff();
      const [announcements, managed] = await Promise.all([
        db.announcement.findMany(announcementQuery) as Promise<AnnouncementRow[]>,
        content.listManagedEvents(),
      ]);
      return { announcements, events: managed.filter((event) => !event.cancelled) };
    },

    async eventManagerData() {
      await allowStaff();
      const [events, types] = await Promise.all([content.listManagedEvents(), content.listEventTypes()]);
      return { events, types };
    },

    async eventFormData(slug?: string) {
      await allowStaff();
      const [types, cohortRows, event] = await Promise.all([
        content.listEventTypes(),
        content.loadCohortsWithCourses(),
        slug ? content.eventBySlug(slug) : Promise.resolve(null),
      ]);
      return { types, cohorts: eventCohortOptions(cohortRows), event };
    },

    async mentorForEdit(slug: string) {
      await allowStaff();
      return content.mentorBySlug(slug);
    },

    async courseEditorData(slug: string) {
      await allowStaff();
      const course = await content.courseBySlug(slug);
      if (!course) return { course: null, lessons: [], tracks: [] };
      const [lessons, tracks] = await Promise.all([
        content.lessonsForCourse(course.id),
        content.tracksForCourse(course.id),
      ]);
      return { course, lessons, tracks };
    },

    async skillTreeForEditor() {
      await allowLead();
      return content.loadSkillTree();
    },
  };
}

const staffData = makeStaffData({
  requireStaff,
  requireLead,
  db: prisma as unknown as StaffDb,
  content: {
    loadCourseCatalog,
    loadCohortsWithCourses,
    listMentors,
    listCourses,
    listManagedEvents,
    listEventTypes,
    eventBySlug,
    mentorBySlug,
    courseBySlug,
    lessonsForCourse,
    tracksForCourse,
    loadSkillTree,
  },
});

export const {
  staffDashboard,
  accessPageData,
  announcementsData,
  eventManagerData,
  eventFormData,
  mentorForEdit,
  courseEditorData,
  skillTreeForEditor,
} = staffData;
