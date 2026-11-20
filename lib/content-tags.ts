/**
 * Tags for the shared public reads in lib/content.ts.
 * A save action refreshes only the tags for the rows it changed.
 */

export const contentTags = {
  courses: "courses",
  cohorts: "cohorts",
  mentors: "mentors",
  events: "events",
  skillTree: "skill-tree",
  course: (slug: string) => `course:${slug}`,
  lessons: (courseId: string) => `lessons:${courseId}`,
  pageCopy: (page: "events" | "sessions") => `page-copy:${page}`,
} as const;

/** About an hour. expire must be longer than revalidate, so the hard ceiling is one hour. */
export const contentCacheLife = { stale: 300, revalidate: 3_599, expire: 3_600 };

export function programSaveTags(slugs: readonly string[]) {
  return [contentTags.courses, ...slugs.map((slug) => contentTags.course(slug))];
}

export function lessonSaveTags(course: { id: string; slug: string }) {
  return [contentTags.lessons(course.id), contentTags.course(course.slug)];
}

export function cohortSaveTags(slug: string) {
  return [contentTags.cohorts, contentTags.course(slug)];
}

export function mentorSaveTags() {
  return [contentTags.mentors];
}

export function sessionsCopyTags() {
  return [contentTags.pageCopy("sessions"), contentTags.mentors];
}

export function eventsCopyTags() {
  return [contentTags.pageCopy("events"), contentTags.events];
}

export function eventSaveTags() {
  return [contentTags.events];
}

export function skillTreeSaveTags() {
  return [contentTags.skillTree];
}

/** Calls update once per tag. Blank and repeated tags are skipped. */
export function eachContentTag(tags: readonly string[], update: (tag: string) => void) {
  const seen = new Set<string>();
  for (const tag of tags) {
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    update(tag);
  }
}
