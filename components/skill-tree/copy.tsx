"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSkillCopy } from "@/app/lead-copy-actions";
import { LeadEditFrame } from "@/components/lead-edit";
import type { SkillNode } from "@/lib/skill-tree";
import { SkillCopyContext } from "./copy-context";
import { SkillTreeShell } from "./shell";
import { SkillTreeView } from "./views";

export function SkillCopyEditor({
  lead,
  stack,
}: {
  lead: boolean;
  stack: SkillNode[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = Object.keys(drafts).length > 0;

  const shell = (
    <SkillTreeShell stack={stack}>
      <SkillCopyContext.Provider
        value={{
          editing,
          value: (path, fallback) => (path in drafts ? drafts[path] : fallback),
          change: (path, value) => setDrafts((current) => ({ ...current, [path]: value })),
          error: (path) => errors[path],
        }}
      >
        <SkillTreeView stack={stack} />
      </SkillCopyContext.Provider>
    </SkillTreeShell>
  );

  if (!lead) return shell;

  return (
    <LeadEditFrame
      editing={editing}
      saving={saving}
      dirty={dirty}
      message={message}
      onEdit={() => {
        setDrafts({});
        setErrors({});
        setMessage(null);
        setEditing(true);
      }}
      onCancel={() => {
        setDrafts({});
        setErrors({});
        setMessage(null);
        setEditing(false);
      }}
      onSave={() => void onSave()}
    >
      {shell}
    </LeadEditFrame>
  );

  async function onSave() {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const patches = Object.entries(drafts).map(([path, value]) => ({ path, value }));
      const result = await saveSkillCopy(patches);
      if (!result.ok) {
        setMessage(result.message);
        setErrors(result.fieldErrors);
        setSaving(false);
        return;
      }
      setDrafts({});
      setErrors({});
      setMessage(null);
      setEditing(false);
      setSaving(false);
      router.refresh();
    } catch {
      setMessage("Could not save. Try again.");
      setSaving(false);
    }
  }
}

