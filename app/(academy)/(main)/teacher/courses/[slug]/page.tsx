import { notFound } from "next/navigation";
import { addLesson } from "@/app/actions";
import { StaffCrumb } from "@/components/staff-crumb";
import { Form } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { listCourses } from "@/lib/content";
import { courseEditorData } from "@/lib/staff-data";
import { withSample } from "@/lib/static-params";
import { defaultVideoProvider, videoProviders } from "@/lib/video";

export const instant = false;

// Known slugs are prerendered here. A missing one is a 404 from the proxy, which a prefetch skips.
export async function generateStaticParams() {
  const courses = await listCourses();
  return withSample(courses.map((course) => ({ slug: course.slug })), { slug: "_" });
}

export default async function EditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; added?: string }>;
}) {
  const { slug } = await params;
  const { course, lessons, tracks } = await courseEditorData(slug);
  if (!course) notFound();
  const query = await searchParams;
  const cohortName = new Map(course.cohorts.map((cohort) => [cohort.id, cohort.name]));
  const trackName = new Map(tracks.map((track) => [track.id, track.title]));
  return (
    <>
        <StaffCrumb page={course.title} />
        <h1 className="page-title" style={{ marginBottom: 12 }}>{course.title}</h1>
        {query.added ? <div className="banner">Lesson added. Students see it the next time they open the course.</div> : null}
        {query.error ? <div className="error">A lesson needs a title, a video URL, a duration, and a cohort if this is a bootcamp.</div> : null}
        <div className="split">
          <section className="card" style={{ padding: "8px 16px" }}>
            <h2 className="section-label">Lessons</h2>
            {lessons.length === 0 ? <p className="note">No lessons yet.</p> : null}
            {lessons.map((lesson) => {
              const cohort = lesson.cohortId ? cohortName.get(lesson.cohortId) : undefined;
              const track = lesson.trackId ? trackName.get(lesson.trackId) : undefined;
              return (
                <div key={lesson.id} className="list-row">
                  <div>
                    <b>
                      {lesson.position}. {lesson.title}
                    </b>
                    <div className="note">
                      {cohort ? `${cohort} · ` : ""}
                      {track ? `${track} · ` : ""}
                      {lesson.videoProvider} · {lesson.runtimeLabel}
                      {lesson.headliner ? " · Headliner" : ""}
                      {lesson.drip ? " · dripped" : ""}
                      {lesson.slidesTitle ? " · slides" : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
          <Form action={addLesson} className="card stack" style={{ padding: 18 }}>
            <h2 className="section-label">Add a lesson</h2>
            <input type="hidden" name="courseId" value={course.id} />
            {course.access === "cohort" ? (
              <>
                <Label htmlFor="cohortId">Cohort</Label>
                <select id="cohortId" name="cohortId" className="h-11 rounded-[25px] border border-white/15 bg-[#121212] px-4" required>
                  <option value="">Choose a cohort</option>
                  {course.cohorts.map((cohort) => (
                    <option key={cohort.id} value={cohort.id}>
                      {cohort.name}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
            {tracks.length > 0 ? (
              <>
                <Label htmlFor="trackId">Track</Label>
                <select id="trackId" name="trackId" className="h-11 rounded-[25px] border border-white/15 bg-[#121212] px-4" defaultValue="">
                  <option value="">No track</option>
                  {tracks.map((track) => (
                    <option key={track.id} value={track.id}>{track.title}</option>
                  ))}
                </select>
              </>
            ) : null}
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required />
            <Label htmlFor="summary">Handout notes</Label>
            <Textarea id="summary" name="summary" placeholder="One idea per line. This becomes the PDF." />
            <Label htmlFor="durationMin">Minutes</Label>
            <Input id="durationMin" name="durationMin" type="number" min={1} max={300} required />
            <Label htmlFor="videoProvider">Video source</Label>
            <select id="videoProvider" name="videoProvider" className="h-11 rounded-[25px] border border-white/15 bg-[#121212] px-4" defaultValue={defaultVideoProvider}>
              {videoProviders.map((provider) => (
                <option key={provider.id} value={provider.id}>{provider.label}</option>
              ))}
            </select>
            <Label htmlFor="videoUrl">Video URL</Label>
            <Input id="videoUrl" name="videoUrl" placeholder="https://drive.google.com/file/d/…/view" required />
            <Label htmlFor="slidesTitle">Slides title</Label>
            <Input id="slidesTitle" name="slidesTitle" placeholder="Slides: Beatmatching by Ear" />
            <Label htmlFor="slidesMeta">Slides label</Label>
            <Input id="slidesMeta" name="slidesMeta" placeholder="PDF · 24 slides · 3.2 MB" />
            <div className="check-row">
              {course.access === "headliner" ? (
                <label>
                  <input type="checkbox" name="headliner" /> In the Headliner set
                </label>
              ) : null}
              <label>
                <input type="checkbox" name="drip" /> Lock until earlier lessons are done
              </label>
            </div>
            <Button type="submit" className="self-start">Add lesson</Button>
          </Form>
        </div>
    </>
  );
}
