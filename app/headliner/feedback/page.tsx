import Link from "next/link";
import { commentOnSubmission, submitFeedback } from "@/app/actions";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireUser } from "@/lib/auth";
import { formatCad, prices } from "@/lib/config";
import { prisma } from "@/lib/db";
import { feedbackAccess, isStaff } from "@/lib/entitlements";
import { submissionKindLabel, submissionKinds } from "@/lib/feedback";
import { entitlementRecords } from "@/lib/learn";

export const dynamic = "force-dynamic";

function when(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const records = await entitlementRecords(user.id);
  const perk = feedbackAccess({ role: user.role, entitlements: records });

  if (!perk.allowed) {
    const subscribeHref = "/checkout?product=headliner";
    return (
      <>
        <AppHeader active="courses" />
        <main className="shell">
          <div className="crumbs">
            <Link href="/headliner">Headliner</Link> › <b>Feedback</b>
          </div>
          <section className="upsell">
            <div className="kicker">Headliner</div>
            <h2>Feedback is for Headliners</h2>
            <p>
              Submit a mix or a track, and comment on what other Headliners post. A single course or a bootcamp seat does not open this room.
            </p>
            <Link className="pill pill-purple" href={subscribeHref}>
              Subscribe · {formatCad(prices.headlinerMonthlyCents, "month")}
            </Link>
          </section>
        </main>
      </>
    );
  }

  const submissions = await prisma.submission.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true, comments: { include: { user: true }, orderBy: { createdAt: "asc" } } },
  });

  return (
    <>
      <AppHeader active="courses" />
      <main className="shell">
        <div className="crumbs">
          <Link href="/headliner">Headliner</Link> › <b>Feedback</b>
        </div>
        <h1 className="page-title" style={{ marginBottom: 8 }}>Feedback space</h1>
        <p className="note" style={{ marginBottom: 16, maxWidth: 640 }}>
          Share a SoundCloud, Drive, or other file link. Headliners can comment. Teachers see every submission on the desk.
        </p>
        {query.sent ? <div className="banner">Sent. It’s on the board.</div> : null}
        {query.error ? <div className="error">Need a title, a mix or track, and an http(s) link.</div> : null}
        <form action={submitFeedback} className="card stack" style={{ padding: 18, maxWidth: 640, marginBottom: 22 }}>
          <h2 className="section-label">Submit a mix or track</h2>
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required maxLength={120} placeholder="Friday open" />
          <Label htmlFor="url">Link</Label>
          <Input id="url" name="url" type="url" required placeholder="https://soundcloud.com/…" />
          <Label htmlFor="kind">Type</Label>
          <select id="kind" name="kind" className="h-11 rounded-[25px] border border-white/15 bg-[#121212] px-4" defaultValue={submissionKinds[0]?.id}>
            {submissionKinds.map((kind) => (
              <option key={kind.id} value={kind.id}>{kind.label}</option>
            ))}
          </select>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" placeholder="What do you want people to listen for?" />
          <Button type="submit" className="self-start">Submit</Button>
        </form>
        {submissions.length === 0 ? (
          <div className="card" style={{ padding: 18 }}>
            <p>No mixes or tracks yet. Be the first to drop a link.</p>
          </div>
        ) : (
          submissions.map((submission) => (
            <article key={submission.id} id={`sub-${submission.id}`} className="card" style={{ padding: "14px 18px", marginBottom: 14 }}>
              <div className="who">
                <b>{submission.title}</b>
                <span className="tag" style={{ marginLeft: 8 }}>{submissionKindLabel(submission.kind)}</span>
              </div>
              <p className="note" style={{ marginTop: 4 }}>
                {submission.user.name} · {when(submission.createdAt)}
              </p>
              <p style={{ marginTop: 8 }}>
                <a href={submission.url} target="_blank" rel="noreferrer">{submission.url}</a>
              </p>
              {submission.notes ? <p style={{ marginTop: 8 }}>{submission.notes}</p> : null}
              <div style={{ marginTop: 8 }}>
                {submission.comments.map((comment) => (
                  <div key={comment.id} className="thread">
                    <div className="who">
                      <b>{comment.user.name}</b>
                      {isStaff(comment.user.role) ? <span className="staff">Teacher</span> : null}
                      <span> · {when(comment.createdAt)}</span>
                    </div>
                    <p>{comment.body}</p>
                  </div>
                ))}
              </div>
              <form action={commentOnSubmission} className="stack" style={{ marginTop: 12 }}>
                <input type="hidden" name="submissionId" value={submission.id} />
                <Textarea name="body" required placeholder="Leave a note" />
                <Button type="submit" variant="black" className="self-start">Comment</Button>
              </form>
            </article>
          ))
        )}
      </main>
    </>
  );
}
