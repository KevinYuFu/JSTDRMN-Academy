import type { Metadata } from "next";
import { SkillTreeEditor } from "@/components/skill-tree/editor";
import { StaffCrumb } from "@/components/staff-crumb";
import { requireLead } from "@/lib/auth";
import { loadSkillTree } from "@/lib/content";
import { skillTreeErrorCopy, skillTreeSavedCopy } from "@/lib/skill-tree-edit";
import { findNode, type SkillNode } from "@/lib/skill-tree";

export const instant = false;

export const metadata: Metadata = {
  title: "Skill tree · JSTDRMN Academy",
};

function SkillFrame({ tree, role, saved, error, selectedId }: { tree: SkillNode; role: string; saved: string | null; error: string | null; selectedId: string }) {
  return (
    <main className="shell">
      <StaffCrumb role={role} page="Skill tree" />
      <h1 className="page-title" style={{ marginBottom: 6 }}>Skill tree</h1>
      <p className="note" style={{ marginBottom: 12 }}>
        This is the public map. Save a change, then open the public page to see it. Only a Lead can edit.
      </p>
      {saved ? <div className="banner">{saved}</div> : null}
      {error ? <div className="error">{error}</div> : null}
      <SkillTreeEditor tree={tree} selectedId={selectedId} />
    </main>
  );
}

async function SkillLive({
  searchParams,
}: {
  searchParams: Promise<{ node?: string; saved?: string; error?: string }>;
}) {
  const lead = await requireLead();
  const [tree, query] = await Promise.all([loadSkillTree(), searchParams]);
  const requested = query.node ? findNode(query.node, tree) : tree;
  const selected = requested ?? tree;
  const saved = query.saved ? (skillTreeSavedCopy[query.saved] ?? null) : null;
  const error =
    query.node && !requested
      ? skillTreeErrorCopy.missing
      : query.error
        ? (skillTreeErrorCopy[query.error] ?? skillTreeErrorCopy.invalid)
        : null;
  return <SkillFrame tree={tree} role={lead.role} saved={saved} error={error} selectedId={selected.id} />;
}

export default async function TeacherSkillTreePage({
  searchParams,
}: {
  searchParams: Promise<{ node?: string; saved?: string; error?: string }>;
}) {
  return await SkillLive({ searchParams });
}
