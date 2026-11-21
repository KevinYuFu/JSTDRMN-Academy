import Link from "next/link";
import { roleLabel } from "@/lib/roles";

/** The staff breadcrumb. The role is already known, so the label does not change after load. */
export function StaffCrumb({ role, page }: { role: string; page: string }) {
  return (
    <div className="crumbs">
      <Link href="/teacher">{roleLabel(role)}</Link> › <b>{page}</b>
    </div>
  );
}
