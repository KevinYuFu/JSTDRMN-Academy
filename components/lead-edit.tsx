"use client";

import { useLayoutEffect, type ReactNode } from "react";
import { programEditCopy } from "@/lib/program-edit";
import styles from "./program-editor.module.css";

function useSiteHeaderHeight() {
  useLayoutEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!header) return;
    const apply = () => {
      const height = Math.ceil(header.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--site-header-height", `${height}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(header);
    window.addEventListener("resize", apply);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, []);
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
      {editing && message ? (
        <div className={styles.alert} role="alert">
          {message}
        </div>
      ) : null}
      {editing ? (
        <span className={styles.status} aria-live="polite">
          {saving ? programEditCopy.saving : dirty ? programEditCopy.dirty : programEditCopy.clean}
        </span>
      ) : null}
      {editing ? (
        <>
          <button type="button" className={`pill pill-black ${styles.action}`} onClick={onCancel} disabled={saving}>
            {programEditCopy.cancel}
          </button>
          <button type="button" className={`pill pill-purple ${styles.action}`} onClick={onSave} disabled={saving || !dirty}>
            {saving ? programEditCopy.saving : programEditCopy.save}
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

export function LeadEditorLayout({ toolbar, children }: { toolbar: ReactNode; children: ReactNode }) {
  useSiteHeaderHeight();
  return (
    <div className={styles.editorColumn} data-lead-editor-layout>
      {toolbar}
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
