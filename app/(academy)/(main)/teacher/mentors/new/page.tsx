import { StaffCrumb } from "@/components/staff-crumb";
import { MentorForm } from "@/components/mentor-form";
import { requireStaff } from "@/lib/auth";

export const instant = false;

function NewMentorBody({ role, error }: { role: string; error: boolean }) {
  return (
    <main className="shell">
      <StaffCrumb role={role} page="New mentor" />
      <h1 className="page-title" style={{ marginBottom: 12 }}>New mentor</h1>
      {error ? <div className="error">Name, role line, and bio are required. Photo URL, if you add one, starts with http.</div> : null}
      <MentorForm mentor={null} />
    </main>
  );
}

async function NewMentorLive({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [staff, query] = await Promise.all([requireStaff(), searchParams]);
  return <NewMentorBody role={staff.role} error={Boolean(query.error)} />;
}

export default async function NewMentorPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return await NewMentorLive({ searchParams });
}
