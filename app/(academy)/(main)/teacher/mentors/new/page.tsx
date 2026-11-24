import { MentorForm } from "@/components/mentor-form";
import { StaffCrumb } from "@/components/staff-crumb";
import { mentorFormError } from "@/lib/staff-copy";
import { newMentorForm } from "@/lib/staff-data";

export const instant = false;

export default async function NewMentorPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await newMentorForm();
  const query = await searchParams;
  return (
    <>
      <StaffCrumb page="New mentor" />
      <h1 className="page-title" style={{ marginBottom: 12 }}>New mentor</h1>
      {query.error ? <div className="error">{mentorFormError}</div> : null}
      <MentorForm mentor={null} />
    </>
  );
}
