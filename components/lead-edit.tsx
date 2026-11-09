"use client";

import { useEffect, type ReactNode } from "react";
import { bindEditIsolation } from "@/lib/edit-isolation";
import { programEditCopy } from "@/lib/program-edit";
import styles from "./program-editor.module.css";

function useEditIsolation(active: boolean, dirty: boolean) {
  useEffect(() => {
    if (!active) return;
    return bindEditIsolation(dirty);
  }, [active, dirty]);
}

export function LeadActionRow({
  editing,
  saving,
  dirty,
  message,
  onEdit,
  onCancel,
  onSave,
  label,
  marker,
}: {
  editing: boolean;
  saving: boolean;
  dirty: boolean;
  message: string | null;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  label: string;
  marker?: string;
}) {
  return (
    <div
      className={styles.actionRow}
      role="group"
      aria-label={label}
      data-lead-editor={editing ? "edit" : "view"}
      data-program-editor={marker}
    >
      {editing ? (
        <span className={styles.sr} aria-live="polite">
          {saving ? programEditCopy.saving : dirty ? programEditCopy.dirty : programEditCopy.clean}
        </span>
      ) : null}
      {editing && message ? (
        <div className={styles.alert} role="alert">
          {message}
        </div>
      ) : null}
      {editing ? (
        <>
          <button type="button" className={`pill pill-black ${styles.action}`} onClick={onCancel} disabled={saving}>
            {programEditCopy.cancel}
          </button>
          <button type="button" className={`pill pill-purple ${styles.action}`} onClick={onSave} disabled={saving || !dirty}>
            {programEditCopy.save}
          </button>
        </>
      ) : (
        <button type="button" className={`pill pill-purple ${styles.action}`} onClick={onEdit}>
          {programEditCopy.edit}
        </button>
      )}
    </div>
  );
}

export function LeadEditorLayout({
  editing,
  dirty,
  toolbar,
  children,
}: {
  editing: boolean;
  dirty: boolean;
  toolbar: ReactNode;
  children: ReactNode;
}) {
  useEditIsolation(editing, dirty);
  return (
    <div className={styles.editorColumn} data-lead-editor-layout data-lead-editing={editing ? "true" : undefined}>
      <div className={styles.anchor}>{toolbar}</div>
      {children}
    </div>
  );
}

export function LeadEditFrame({
  editing,
  saving,
  dirty,
  message,
  onEdit,
  onCancel,
  onSave,
  children,
}: {
  editing: boolean;
  saving: boolean;
  dirty: boolean;
  message: string | null;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  children: ReactNode;
}) {
  return (
    <LeadEditorLayout
      editing={editing}
      dirty={dirty}
      toolbar={
        <LeadActionRow
          editing={editing}
          saving={saving}
          dirty={dirty}
          message={message}
          onEdit={onEdit}
          onCancel={onCancel}
          onSave={onSave}
          label="Page editing"
        />
      }
    >
      {children}
    </LeadEditorLayout>
  );
}
