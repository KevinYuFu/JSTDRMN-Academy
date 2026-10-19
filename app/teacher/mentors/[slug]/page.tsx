import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { MentorForm } from "@/components/mentor-form";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditMentorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireStaff();
  const { slug } = await params;
  const query = await searchParams;
  const mentor = await prisma.mentor.findUnique({ where: { slug } });
  if (!mentor) notFound();
  return (
    <>
      <AppHeader active="teacher" />
      <main className="shell">
        <div className="crumbs">
          <Link href="/teacher">Academy lead</Link> › <b>{mentor.name}</b>
        </div>
        <h1 className="page-title" style={{ marginBottom: 12 }}>{mentor.name}</h1>
        {query.error ? <div className="error">Name, role line, and bio are required. Photo URL, if you add one, starts with http.</div> : null}
        <MentorForm mentor={mentor} />
      </main>
    </>
  );
}
