import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { SkillCopyEditor } from "@/components/skill-tree/copy";
import { getUser } from "@/lib/auth";
import { canEditPrograms } from "@/lib/program-edit";
import { skillTreeNav, stackFromSlug } from "@/lib/skill-tree";
import { loadSkillTree } from "@/lib/skill-tree-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${skillTreeNav.label} · JSTDRMN Academy`,
  description: "Academy map. Open a branch to see what is confirmed. Missing curriculum stays blank.",
};

/**
 * Public preview, same idea as the Programs homepage.
 * Dashboard and checkout stay behind login. This map does not.
 */
export default async function SkillTreePage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const [{ slug }, tree, user] = await Promise.all([params, loadSkillTree(), getUser()]);
  const stack = stackFromSlug(slug, tree);
  if (!stack) notFound();
  return (
    <>
      <AppHeader active={skillTreeNav.key} />
      <SkillCopyEditor lead={canEditPrograms(user?.role)} stack={stack} />
    </>
  );
}
