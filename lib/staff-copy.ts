export const eventFormError =
  "Title, description, type, and a Toronto start and end are required. A cohort audience needs a cohort.";

export const mentorFormError =
  "Name, role line, and bio are required. Photo URL, if you add one, starts with http.";

export function eventCohortOptions(rows: readonly { id: string; name: string; course: { title: string } }[]) {
  return rows.map((cohort) => ({ id: cohort.id, name: cohort.name, course: cohort.course.title }));
}
