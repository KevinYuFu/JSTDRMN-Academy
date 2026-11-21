import { MentorForm } from "@/components/mentor-form";
import { StaffCrumb } from "@/components/staff-crumb";
import { requireStaff } from "@/lib/auth";

export const instant = false;

export default async function NewMentorPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const staff = await requireStaff();
  const query = await searchParams;
  return (
    <>
      <main className="shell">
        <StaffCrumb role={staff.role} page="New mentor" />
        <h1 className="page-title" style={{ marginBottom: 12 }}>New mentor</h1>
        {query.error ? <div className="error">Name, role line, and bio are required. Photo URL, if you add one, starts with http.</div> : null}
        <MentorForm mentor={null} />
      </main>
    </>
  );
}
