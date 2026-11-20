import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SkillCopyEditor } from "@/components/skill-tree/copy";
import { getUser } from "@/lib/auth";
import { canEditPrograms } from "@/lib/program-edit";
import { skillTreeNav, skillTreeParams, stackFromSlug, type SkillNode } from "@/lib/skill-tree";
import { loadSkillTree } from "@/lib/content";

export const metadata: Metadata = {
  title: `${skillTreeNav.label} · JSTDRMN Academy`,
  description: "Academy map. Open a branch to see what is confirmed. Missing curriculum stays blank.",
};

export async function generateStaticParams() {
  return skillTreeParams(await loadSkillTree());
}

/**
 * Public preview, same idea as the Programs homepage.
 * Dashboard and checkout stay behind login. This map does not.
 */
async function SkillTreeForViewer({ stack }: { stack: SkillNode[] }) {
  const user = await getUser();
  return <SkillCopyEditor lead={canEditPrograms(user?.role)} stack={stack} />;
}

export default async function SkillTreePage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const tree = await loadSkillTree();
  const stack = stackFromSlug(slug, tree);
  if (!stack) notFound();
  return (
    <Suspense fallback={<SkillCopyEditor lead={false} stack={stack} />}>
      <SkillTreeForViewer stack={stack} />
    </Suspense>
  );
}
