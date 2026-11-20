import { cacheLife, cacheTag, updateTag } from "next/cache";
import type { Cohort, Course, Lesson } from "@prisma/client";
import { prisma } from "./db";
import { pageCopyKeys, readPageCopy, type PageCopy, type PageCopyKey } from "./page-copy";
import { readSkillTree, type SkillTreeStore } from "./skill-tree-store";
import type { SkillNode } from "./skill-tree";
import { contentCacheLife, contentTags, eachContentTag } from "./content-tags";

type CourseWithCohorts = Course & { cohorts: Cohort[] };
type CatalogCourse = CourseWithCohorts & { lessons: Lesson[] };

export function refreshContent(tags: readonly string[]) {
  eachContentTag(tags, updateTag);
}

/** Misses expire quickly so the first row can be written outside this cache. */
export async function readCachedSkillTree(): Promise<SkillNode | null> {
  "use cache";
  cacheTag(contentTags.skillTree);
  const tree = await readSkillTree(prisma as unknown as SkillTreeStore);
  if (!tree) {
    cacheLife({ stale: 0, revalidate: 1, expire: 2 });
    return null;
  }
  cacheLife(contentCacheLife);
  return tree;
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

/** Public board. Inactive and cancelled rows stay on the teacher pages. */
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
