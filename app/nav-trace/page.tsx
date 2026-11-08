import { notFound } from "next/navigation";
import { NavTraceDump } from "@/components/nav-trace-dump";

export const dynamic = "force-dynamic";

export default function NavTracePage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <NavTraceDump />;
}
