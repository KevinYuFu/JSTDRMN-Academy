import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { SkillTreeShell } from "@/components/skill-tree/shell";
import { SkillTreeView } from "@/components/skill-tree/views";
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
export default function SkillTreePage({ params }: { params: Promise<{ slug?: string[] }> }) {
  return (
    <>
      <AppHeader active={skillTreeNav.key} />
      <SkillTreeBody params={params} />
    </>
  );
}

async function SkillTreeBody({ params }: { params: Promise<{ slug?: string[] }> }) {
  const [tree, { slug }] = await Promise.all([loadSkillTree(), params]);
  const stack = stackFromSlug(slug, tree);
  if (!stack) notFound();
  return (
    <SkillTreeShell stack={stack}>
      <SkillTreeView stack={stack} />
    </SkillTreeShell>
  );
}
