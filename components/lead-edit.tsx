"use client";

import type { ReactNode } from "react";
import { programEditCopy } from "@/lib/program-edit";
import styles from "./program-editor.module.css";

export function LeadEditFrame({
  placement,
  editing,
  saving,
  dirty,
  message,
  onEdit,
  onCancel,
  onSave,
  children,
}: {
  placement: "page" | "inset";
  editing: boolean;
  saving: boolean;
  dirty: boolean;
  message: string | null;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  children: ReactNode;
}) {
  const toolbar = placement === "page" ? `${styles.toolbar} ${styles.page}` : `${styles.toolbar} ${styles.inset}`;
  const alert = placement === "page" ? `${styles.alert} ${styles.alertPage}` : `${styles.alert} ${styles.alertShell}`;
  return (
    <>
      <div className={toolbar} role="group" aria-label="Page editing" data-lead-editor={editing ? "edit" : "view"}>
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
      {editing && message ? (
        <div className={alert} role="alert">
          {message}
        </div>
      ) : null}
      {children}
    </>
  );
}
