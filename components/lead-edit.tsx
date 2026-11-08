"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { programEditCopy } from "@/lib/program-edit";
import styles from "./program-editor.module.css";

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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dock = mounted
    ? createPortal(
        <>
          <div className={styles.toolbar} role="group" aria-label="Page editing" data-lead-editor={editing ? "edit" : "view"}>
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
            <div className={`${styles.alert} ${styles.notice}`} role="alert">
              {message}
            </div>
          ) : null}
        </>,
        document.body,
      )
    : null;
  return (
    <>
      {dock}
      {children}
    </>
  );
}
