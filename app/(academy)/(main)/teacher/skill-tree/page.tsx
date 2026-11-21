import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { SkillTreeEditor } from "@/components/skill-tree/editor";
import { requireLead } from "@/lib/auth";
import { loadSkillTree } from "@/lib/content";
import { roleLabel } from "@/lib/roles";
import { skillTreeErrorCopy, skillTreeSavedCopy } from "@/lib/skill-tree-edit";
import { findNode, type SkillNode } from "@/lib/skill-tree";

export const metadata: Metadata = {
  title: "Skill tree · JSTDRMN Academy",
};

function SkillFrame({ tree, role, saved, error, selectedId }: { tree: SkillNode | null; role: string | null; saved: string | null; error: string | null; selectedId: string | null }) {
  return (
    <main className="shell">
      <div className="crumbs">
        <Link href="/teacher">{role ? roleLabel(role) : "Dashboard"}</Link> › <b>Skill tree</b>
      </div>
      <h1 className="page-title" style={{ marginBottom: 6 }}>Skill tree</h1>
      <p className="note" style={{ marginBottom: 12 }}>
        This is the public map. Save a change, then open the public page to see it. Only a Lead can edit.
      </p>
      {saved ? <div className="banner">{saved}</div> : null}
      {error ? <div className="error">{error}</div> : null}
      {tree && selectedId ? <SkillTreeEditor tree={tree} selectedId={selectedId} /> : null}
    </main>
  );
}

async function SkillLive({
  tree,
  searchParams,
}: {
  tree: SkillNode;
  searchParams: Promise<{ node?: string; saved?: string; error?: string }>;
}) {
  const [lead, query] = await Promise.all([requireLead(), searchParams]);
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
  const tree = await loadSkillTree();
  return (
    <Suspense fallback={<SkillFrame tree={null} role={null} saved={null} error={null} selectedId={null} />}>
      <SkillLive tree={tree} searchParams={searchParams} />
    </Suspense>
  );
}
