import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { roleLabel } from "@/lib/roles";

/**
 * Staff breadcrumb. The role comes from this request, so the label does not change after load.
 * `parent` is the middle step on the event form (Events › New, Events › title).
 */
export async function StaffCrumb({ page, parent }: { page: string; parent?: { href: string; label: string } }) {
  const staff = await requireStaff();
  const link = parent ? { href: parent.href, label: parent.label } : { href: "/teacher", label: roleLabel(staff.role) };
  return (
    <div className="crumbs">
      <Link href={link.href}>{link.label}</Link> › <b>{page}</b>
    </div>
  );
}
