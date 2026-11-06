import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { SkillTreeEditor } from "@/components/skill-tree/editor";
import { requireLead } from "@/lib/auth";
import { skillTreeErrorCopy, skillTreeSavedCopy } from "@/lib/skill-tree-edit";
import { findNode } from "@/lib/skill-tree";
import { loadSkillTree } from "@/lib/skill-tree-store";
import { roleLabel } from "@/lib/roles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Skill tree · JSTDRMN Academy",
};

export default async function TeacherSkillTreePage({
  searchParams,
}: {
  searchParams: Promise<{ node?: string; saved?: string; error?: string }>;
}) {
  const lead = await requireLead();
  const query = await searchParams;
  const tree = await loadSkillTree();
  const requested = query.node ? findNode(query.node, tree) : tree;
  const selected = requested ?? tree;
  const saved = query.saved ? (skillTreeSavedCopy[query.saved] ?? null) : null;
  const error =
    query.node && !requested
      ? skillTreeErrorCopy.missing
      : query.error
        ? (skillTreeErrorCopy[query.error] ?? skillTreeErrorCopy.invalid)
        : null;

  return (
    <>
      <AppHeader active="teacher" />
      <main className="shell">
        <div className="crumbs">
          <Link href="/teacher">{roleLabel(lead.role)}</Link> › <b>Skill tree</b>
        </div>
        <h1 className="page-title" style={{ marginBottom: 6 }}>Skill tree</h1>
        <p className="note" style={{ marginBottom: 12 }}>
          This is the public map. Save a change, then open the public page to see it. Only a Lead can edit.
        </p>
        {saved ? <div className="banner">{saved}</div> : null}
        {error ? <div className="error">{error}</div> : null}
        <SkillTreeEditor tree={tree} selectedId={selected.id} />
      </main>
    </>
  );
}
