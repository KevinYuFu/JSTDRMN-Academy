import "server-only";
import type { Prisma } from "@prisma/client";
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

type StaffDb = Pick<
  typeof prisma,
  "comment" | "user" | "hubspotLog" | "sessionRequest" | "entitlement" | "pendingGrant" | "announcement"
>;

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
        db.comment.findMany(commentQuery),
        db.user.findMany(peopleQuery),
        db.hubspotLog.findMany(logQuery),
        content.loadCohortsWithCourses(),
        db.sessionRequest.findMany(requestQuery),
        content.listMentors(),
      ]);
      return { staff, catalog, comments, people, logs, cohorts, requests, mentors };
    },

    async accessPageData() {
      await allowStaff();
      const [courses, cohorts, entitlements, pending, students] = await Promise.all([
        content.listCourses(),
        content.loadCohortsWithCourses(),
        db.entitlement.findMany(entitlementQuery),
        db.pendingGrant.findMany(pendingQuery),
        db.user.findMany(studentQuery),
      ]);
      return { courses, cohorts, entitlements, pending, students };
    },

    async announcementsData() {
      await allowStaff();
      const [announcements, managed] = await Promise.all([
        db.announcement.findMany(announcementQuery),
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

    async newMentorForm() {
      await allowStaff();
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
  db: prisma,
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
  newMentorForm,
  mentorForEdit,
  courseEditorData,
  skillTreeForEditor,
} = staffData;
