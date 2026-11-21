import { cacheLife, cacheTag, updateTag } from "next/cache";
import type { Cohort, Course, Lesson, Track } from "@prisma/client";
import { prisma } from "./db";
import { pageCopyKeys, readPageCopy, type PageCopy, type PageCopyKey } from "./page-copy";
import type { SkillNode } from "./skill-tree";
import { ensureSkillTree, skillTreeClient, skillTreeForRead, writeSkillTree } from "./skill-tree-store";
import { contentCacheLife, contentTags, eachContentTag } from "./content-tags";

type CourseWithCohorts = Course & { cohorts: Cohort[] };
type CatalogCourse = CourseWithCohorts & { lessons: Lesson[] };

export function refreshContent(tags: readonly string[]) {
  eachContentTag(tags, updateTag);
}

/** A missing row is the built-in map. This cache never writes it. */
export async function loadSkillTree(): Promise<SkillNode> {
  "use cache";
  cacheTag(contentTags.skillTree);
  cacheLife(contentCacheLife);
  return skillTreeForRead(skillTreeClient(prisma));
}

/** The row a save will rewrite. Never the cached copy. */
export async function loadSkillTreeForWrite() {
  return (await ensureSkillTree(skillTreeClient(prisma))).tree;
}

export async function saveSkillTree(tree: SkillNode) {
  return writeSkillTree(tree, skillTreeClient(prisma));
}

export async function listCourses(): Promise<Course[]> {
  "use cache";
  cacheTag(contentTags.courses);
  cacheLife(contentCacheLife);
  return prisma.course.findMany({ orderBy: { sort: "asc" } });
}

export async function courseBySlug(slug: string): Promise<CourseWithCohorts | null> {
  "use cache";
  cacheTag(contentTags.course(slug));
  cacheLife(contentCacheLife);
  return prisma.course.findUnique({
    where: { slug },
    include: { cohorts: { orderBy: { sort: "asc" } } },
  });
}

export async function lessonsForCourse(courseId: string): Promise<Lesson[]> {
  "use cache";
  cacheTag(contentTags.lessons(courseId));
  cacheLife(contentCacheLife);
  return prisma.lesson.findMany({ where: { courseId }, orderBy: { position: "asc" } });
}

export async function listCohorts(): Promise<Cohort[]> {
  "use cache";
  cacheTag(contentTags.cohorts);
  cacheLife(contentCacheLife);
  return prisma.cohort.findMany({ orderBy: { sort: "asc" } });
}

export async function listActiveMentors() {
  "use cache";
  cacheTag(contentTags.mentors);
  cacheLife(contentCacheLife);
  return prisma.mentor.findMany({ where: { active: true }, orderBy: { sort: "asc" } });
}

/** Every mentor card, including hidden ones. The public roster uses listActiveMentors. */
export async function listMentors() {
  "use cache";
  cacheTag(contentTags.mentors);
  cacheLife(contentCacheLife);
  return prisma.mentor.findMany({ orderBy: { sort: "asc" } });
}

export async function mentorBySlug(slug: string) {
  "use cache";
  cacheTag(contentTags.mentors);
  cacheLife(contentCacheLife);
  return prisma.mentor.findUnique({ where: { slug } });
}

export async function tracksForCourse(courseId: string): Promise<Track[]> {
  "use cache";
  cacheTag(contentTags.tracks(courseId));
  cacheLife(contentCacheLife);
  return prisma.track.findMany({ where: { courseId }, orderBy: { position: "asc" } });
}

/** Public board. Inactive and cancelled rows stay on listManagedEvents. */
export async function listEvents() {
  "use cache";
  cacheTag(contentTags.events);
  cacheLife(contentCacheLife);
  return prisma.event.findMany({
    where: { active: true, cancelled: false },
    include: { type: true, cohort: true },
    orderBy: { startsAt: "asc" },
  });
}

/** Staff schedule, including inactive and cancelled rows. */
export async function listManagedEvents() {
  "use cache";
  cacheTag(contentTags.events);
  cacheLife(contentCacheLife);
  return prisma.event.findMany({
    include: { type: true, cohort: true },
    orderBy: { startsAt: "asc" },
  });
}

export async function listEventTypes() {
  "use cache";
  cacheTag(contentTags.events);
  cacheLife(contentCacheLife);
  return prisma.eventType.findMany({ orderBy: { sort: "asc" } });
}

export async function eventBySlug(slug: string) {
  "use cache";
  cacheTag(contentTags.events);
  cacheLife(contentCacheLife);
  return prisma.event.findUnique({ where: { slug } });
}

export async function loadPageCopy(page: PageCopyKey): Promise<PageCopy> {
  "use cache";
  cacheTag(contentTags.pageCopy(page));
  cacheLife(contentCacheLife);
  const stored = await prisma.meta.findUnique({ where: { key: pageCopyKeys[page] } });
  return readPageCopy(page, stored?.value);
}

/** Courses with the cohorts and lessons the dashboard shelf counts. Personal rows stay outside. */
export async function loadCourseCatalog(): Promise<CatalogCourse[]> {
  const courses = await listCourses();
  const [cohorts, lessons] = await Promise.all([
    listCohorts(),
    Promise.all(courses.map((course) => lessonsForCourse(course.id))),
  ]);
  const cohortsByCourse = new Map<string, Cohort[]>();
  for (const cohort of cohorts) {
    const list = cohortsByCourse.get(cohort.courseId);
    if (list) list.push(cohort);
    else cohortsByCourse.set(cohort.courseId, [cohort]);
  }
  return courses.map((course, index) => ({
    ...course,
    cohorts: cohortsByCourse.get(course.id) ?? [],
    lessons: lessons[index] ?? [],
  }));
}

/** Cohorts in sort order, with the course row the staff tables and event form need. */
export async function loadCohortsWithCourses() {
  const [cohorts, courses] = await Promise.all([listCohorts(), listCourses()]);
  const byId = new Map(courses.map((course) => [course.id, course]));
  return cohorts.flatMap((cohort) => {
    const course = byId.get(cohort.courseId);
    return course ? [{ ...cohort, course }] : [];
  });
}
