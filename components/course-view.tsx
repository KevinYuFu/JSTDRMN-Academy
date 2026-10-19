import Link from "next/link";
import { completeLesson, postComment } from "@/app/actions";
import { formatCad, hubspotApplyUrl, prices, programPriceLabel } from "@/lib/config";
import type { openCourse } from "@/lib/learn";
import { isStaff } from "@/lib/entitlements";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Icon } from "./icons";
import { SlidesCard } from "./slides-card";
import { VideoPlayer } from "./video-player";

type CourseData = Awaited<ReturnType<typeof openCourse>>;

function when(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function upsellCopy(data: CourseData) {
  const reason = data.current?.access.reason;
  const title = data.cohort ? `${data.course.title} · ${data.cohort.name}` : data.course.title;
  if (reason === "drip") {
    return {
      kicker: "Locked for now",
      title: data.current?.title ?? "Next lesson",
      body: `“${data.current?.title}” opens when every lesson before it is marked complete.`,
      cta: null as string | null,
      href: null as string | null,
      external: false,
    };
  }
  if (reason === "not_in_headliner") {
    return {
      kicker: "Outside Headliner",
      title: "Not in the Headliner set",
      body: "This lesson sits outside the Headliner set. Another program does not open it.",
      cta: "See programs",
      href: "/",
      external: false,
    };
  }
  if (data.course.access === "headliner") {
    return {
      kicker: reason === "expired" || reason === "revoked" ? "Membership inactive" : "Headliner",
      title: reason === "missing" ? "This lesson is in Headliner" : "Your Headliner membership isn’t active",
      body: "Headliner is one subscription. Access stays while you keep paying. It does not include other programs or a bootcamp seat.",
      cta: `Subscribe · ${formatCad(prices.headlinerMonthlyCents, "month")}`,
      href: "/checkout?product=headliner",
      external: false,
    };
  }
  if (data.course.access === "purchase" || data.course.access === "subscription") {
    const price = programPriceLabel(data.course);
    const monthly = data.course.billing === "monthly";
    const who = data.course.presenter ? `${data.course.presenter} presents ${data.course.title}` : data.course.title;
    return {
      kicker: data.course.statusLabel,
      title: data.course.special ? who : `Unlock ${data.course.title}`,
      body: data.course.description,
      cta: price ? `${monthly ? "Subscribe" : "Buy"} · ${price}` : monthly ? "Subscribe" : "Buy",
      href: `/checkout?product=program&slug=${data.course.slug}`,
      external: false,
    };
  }
  return {
    kicker: data.course.statusLabel,
    title,
    body: `${data.course.description} Seats are granted after you apply and are accepted. Another cohort’s login will not open this portal.`,
    cta: "Apply",
    href: hubspotApplyUrl(data.course.hubspotUrl),
    external: true,
  };
}

export function CourseView({
  data,
  basePath,
  signedIn,
  notice,
}: {
  data: CourseData;
  basePath: string;
  signedIn: boolean;
  notice?: string | null;
}) {
  const current = data.current;
  if (!current) {
    return (
      <main className="shell">
        <div className="crumbs">
          <Link href="/dashboard">My Courses</Link> › <b>{data.course.title}</b>
        </div>
        <h1 className="page-title">{data.course.title}</h1>
        <p className="note" style={{ marginTop: 12 }}>No lessons in this portal yet.</p>
      </main>
    );
  }
  const allowed = current.access.allowed;
  const percent = data.total === 0 ? 0 : Math.round((data.completed / data.total) * 100);
  const hours = data.minutes >= 60 ? `${Math.round(data.minutes / 60)} hr${data.minutes >= 90 ? "s" : ""}` : `${data.minutes} min`;
  const copy = upsellCopy(data);
  const crumb = data.cohort ? `${data.course.title} · ${data.cohort.name}` : data.course.title;

  return (
    <main className="shell">
      <div className="crumbs">
        <Link href="/dashboard">My Courses</Link> › <b>{crumb}</b>
      </div>
      {notice ? <div className="banner">{notice}</div> : null}
      <div className="titlebar">
        <h1 className="page-title">{data.course.title}</h1>
        <div className="progress">
          <div className="lbl">
            <span>Course progress</span>
            <b>
              {data.completed} of {data.total} lessons · {percent}%
            </b>
          </div>
          <div className="bar">
            <span style={{ width: `${percent}%` }} />
          </div>
        </div>
      </div>

      <div className="learn-grid">
        <section>
          {current && allowed ? (
            <VideoPlayer
              title={current.title}
              position={current.position}
              runtime={current.runtimeLabel}
              provider={current.videoProvider}
              url={current.videoUrl}
            />
          ) : (
            <div className="upsell">
              <div className="kicker">{copy.kicker}</div>
              <h2>{copy.title}</h2>
              <p>{copy.body}</p>
              {copy.href && copy.cta ? (
                signedIn || copy.external ? (
                  <a className="pill pill-purple" href={copy.href} target={copy.external ? "_blank" : undefined} rel={copy.external ? "noreferrer" : undefined}>
                    {copy.cta}
                  </a>
                ) : (
                  <Link className="pill pill-purple" href={`/signup?next=${encodeURIComponent(copy.href)}`}>
                    {copy.cta}
                  </Link>
                )
              ) : null}
            </div>
          )}

          {current && allowed && current.slidesTitle ? (
            <SlidesCard title={current.slidesTitle} meta={current.slidesMeta} src={`/api/slides/${current.id}`} />
          ) : null}

          {current && allowed && current.progress !== "completed" ? (
            <form action={completeLesson} style={{ marginTop: 14 }}>
              <input type="hidden" name="lessonId" value={current.id} />
              <input type="hidden" name="next" value={`${basePath}?lesson=${current.id}`} />
              <Button type="submit" variant="black">Mark lesson complete</Button>
            </form>
          ) : null}

          {current && allowed ? (
            <div className="comments" id="comments">
              <h2>Lesson notes</h2>
              {data.comments.length === 0 ? <p className="note">No notes yet. Ask something specific about this lesson.</p> : null}
              {data.comments.map((comment) => (
                <article key={comment.id} className="thread">
                  <div className="who">
                    <b>{comment.user.name}</b>
                    {isStaff(comment.user.role) ? <span className="staff">Teacher</span> : null}
                    <span> · {when(comment.createdAt)}</span>
                  </div>
                  <p>{comment.body}</p>
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="reply thread">
                      <div className="who">
                        <b>{reply.user.name}</b>
                        {isStaff(reply.user.role) ? <span className="staff">Teacher</span> : null}
                        <span> · {when(reply.createdAt)}</span>
                      </div>
                      <p>{reply.body}</p>
                    </div>
                  ))}
                  {data.staff ? (
                    <form action={postComment} className="stack" style={{ marginTop: 8 }}>
                      <input type="hidden" name="lessonId" value={current.id} />
                      <input type="hidden" name="parentId" value={comment.id} />
                      <input type="hidden" name="next" value={`${basePath}?lesson=${current.id}`} />
                      <Textarea name="body" required placeholder="Reply to this note" />
                      <Button type="submit" variant="black" className="self-start">Reply</Button>
                    </form>
                  ) : null}
                </article>
              ))}
              <form action={postComment} className="stack" style={{ marginTop: 16 }}>
                <input type="hidden" name="lessonId" value={current.id} />
                <input type="hidden" name="next" value={`${basePath}?lesson=${current.id}`} />
                <Textarea name="body" required placeholder="Ask the teacher about this lesson" />
                <Button type="submit" className="self-start">Post note</Button>
              </form>
            </div>
          ) : null}
        </section>

        <aside className="card lessons">
          <h2>Lessons</h2>
          <div className="sub">
            {data.lessons.length} lesson{data.lessons.length === 1 ? "" : "s"} · approx. {hours}
          </div>
          <ol>
            {data.lessons.map((lesson) => {
              const done = lesson.progress === "completed";
              const currentLesson = lesson.id === current?.id;
              const meta = done
                ? `${lesson.durationMin} min · Completed`
                : currentLesson && lesson.access.allowed
                  ? `${lesson.durationMin} min · In progress`
                  : `${lesson.durationMin} min`;
              return (
                <li key={lesson.id} className={done ? "done" : currentLesson ? "current" : undefined}>
                  <Link href={`${basePath}?lesson=${lesson.id}`}>
                    <div className="st">{done ? <Icon name="check" /> : lesson.position}</div>
                    <div className="t">
                      <div>
                        {lesson.position}. {lesson.title}
                      </div>
                      <small>{meta}</small>
                    </div>
                    {!lesson.access.allowed ? <Icon name="lock" className="lock" /> : null}
                  </Link>
                </li>
              );
            })}
          </ol>
          {data.lessons.length === 0 ? <p className="note" style={{ padding: 18 }}>No lessons in this portal yet.</p> : null}
        </aside>
      </div>
    </main>
  );
}
