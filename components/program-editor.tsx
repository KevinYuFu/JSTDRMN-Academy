"use client";

import { useEffect, useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createProgramEditorState,
  editorIsDirty,
  programEditCopy,
  reduceProgramEditor,
  submissionFromItems,
  type ProgramEditItem,
  type ProgramEditResponse,
  type ProgramEditScope,
  type ProgramEditSubmission,
  type ProgramTextField,
} from "@/lib/program-edit";
import styles from "./program-editor.module.css";

export function ProgramEditor({
  scope,
  align,
  items,
  save,
  refreshAfterSave = true,
  children,
}: {
  scope: ProgramEditScope;
  align: "page" | "shell";
  items: ProgramEditItem[];
  save: (input: ProgramEditSubmission) => Promise<ProgramEditResponse>;
  /** Reload the server-rendered page after a successful save. */
  refreshAfterSave?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reduceProgramEditor, items, createProgramEditorState);
  const signature = JSON.stringify(items);
  const request = useRef(0);

  useEffect(() => {
    dispatch({ type: "sync", items: JSON.parse(signature) as ProgramEditItem[] });
  }, [signature]);

  useEffect(() => {
    if (state.mode !== "edit" || state.saving) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") dispatch({ type: "cancel" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.mode, state.saving]);

  async function onSave() {
    if (state.saving || !editorIsDirty(state)) return;
    const id = request.current + 1;
    request.current = id;
    dispatch({ type: "saving" });
    try {
      const result = await save(submissionFromItems(scope, state.drafts));
      if (request.current !== id) return;
      if (!result.ok) {
        dispatch({
          type: "failed",
          message: result.message,
          fieldErrors: result.fieldErrors,
        });
        return;
      }
      dispatch({ type: "saved", items: state.drafts });
      if (refreshAfterSave) router.refresh();
    } catch {
      if (request.current !== id) return;
      dispatch({ type: "failed", message: programEditCopy.failed });
    }
  }

  const dirty = editorIsDirty(state);
  const toolbarClass = align === "page" ? `${styles.toolbar} ${styles.page}` : `${styles.toolbar} ${styles.shell}`;

  return (
    <>
      <div className={toolbarClass} role="group" aria-label="Program editing" data-program-editor={state.mode}>
        {state.mode === "edit" ? (
          <span className={styles.status} aria-live="polite">
            {state.saving ? programEditCopy.saving : dirty ? programEditCopy.dirty : programEditCopy.clean}
          </span>
        ) : null}
        {state.mode === "view" ? (
          <button type="button" className={`pill pill-purple ${styles.action}`} onClick={() => dispatch({ type: "edit" })}>
            {programEditCopy.edit}
          </button>
        ) : (
          <>
            <button
              type="button"
              className={`pill pill-black ${styles.action}`}
              onClick={() => dispatch({ type: "cancel" })}
              disabled={state.saving}
            >
              {programEditCopy.cancel}
            </button>
            <button
              type="button"
              className={`pill pill-purple ${styles.action}`}
              onClick={() => void onSave()}
              disabled={state.saving || !dirty}
            >
              {state.saving ? programEditCopy.saving : programEditCopy.save}
            </button>
          </>
        )}
      </div>
      {state.mode === "view" ? (
        children
      ) : (
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            void onSave();
          }}
        >
          <p className={styles.intro}>{programEditCopy.intro}</p>
          {state.message ? (
            <div className={styles.alert} role="alert">
              {state.message}
            </div>
          ) : null}
          {state.drafts.map((draft) => {
            const saved = state.saved.find((item) => item.id === draft.id);
            return (
              <section key={draft.id} className={styles.block} aria-label={saved?.title || draft.title}>
                <h2>{draft.kind === "banner" ? "Top banner" : saved?.title || draft.title}</h2>
                <EditorField
                  itemId={draft.id}
                  field="statusLabel"
                  label="Label"
                  value={draft.statusLabel}
                  maxLength={40}
                  error={state.fieldErrors[`${draft.id}.statusLabel`]}
                  disabled={state.saving}
                  onChange={(value) => dispatch({ type: "change", id: draft.id, field: "statusLabel", value })}
                />
                {draft.kind !== "banner" ? (
                  <EditorField
                    itemId={draft.id}
                    field="presenter"
                    label="Presenter"
                    value={draft.presenter}
                    maxLength={60}
                    hint="Leave blank if none."
                    error={state.fieldErrors[`${draft.id}.presenter`]}
                    disabled={state.saving}
                    onChange={(value) => dispatch({ type: "change", id: draft.id, field: "presenter", value })}
                  />
                ) : null}
                <EditorField
                  itemId={draft.id}
                  field="title"
                  label="Title"
                  value={draft.title}
                  maxLength={80}
                  error={state.fieldErrors[`${draft.id}.title`]}
                  disabled={state.saving}
                  onChange={(value) => dispatch({ type: "change", id: draft.id, field: "title", value })}
                />
                <EditorField
                  itemId={draft.id}
                  field="tagline"
                  label="Short line"
                  value={draft.tagline}
                  maxLength={180}
                  error={state.fieldErrors[`${draft.id}.tagline`]}
                  disabled={state.saving}
                  onChange={(value) => dispatch({ type: "change", id: draft.id, field: "tagline", value })}
                />
                {scope === "detail" ? (
                  <EditorField
                    itemId={draft.id}
                    field="description"
                    label="About"
                    value={draft.description}
                    maxLength={2000}
                    multiline
                    error={state.fieldErrors[`${draft.id}.description`]}
                    disabled={state.saving}
                    onChange={(value) => dispatch({ type: "change", id: draft.id, field: "description", value })}
                  />
                ) : null}
                {draft.priceEditable ? (
                  <EditorField
                    itemId={draft.id}
                    field="price"
                    label="Price"
                    value={draft.price}
                    hint="Example: 20 or 20.50"
                    error={state.fieldErrors[`${draft.id}.price`]}
                    disabled={state.saving}
                    onChange={(value) => dispatch({ type: "change", id: draft.id, field: "price", value })}
                  />
                ) : draft.priceNote ? (
                  <p className={styles.note}>{draft.priceNote}</p>
                ) : null}
              </section>
            );
          })}
        </form>
      )}
    </>
  );
}

function EditorField({
  itemId,
  field,
  label,
  value,
  error,
  hint,
  maxLength,
  multiline,
  disabled,
  onChange,
}: {
  itemId: string;
  field: ProgramTextField;
  label: string;
  value: string;
  error?: string;
  hint?: string;
  maxLength?: number;
  multiline?: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const id = `program-${itemId}-${field}`;
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={styles.field}>
      <Label htmlFor={id}>{label}</Label>
      {multiline ? (
        <Textarea
          id={id}
          value={value}
          maxLength={maxLength}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          id={id}
          value={value}
          maxLength={maxLength}
          disabled={disabled}
          inputMode={field === "price" ? "decimal" : undefined}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {hint ? (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className={styles.fieldError} id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
