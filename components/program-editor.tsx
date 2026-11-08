"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useReducer, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  createProgramEditorState,
  editorIsDirty,
  formatShownPrice,
  parsePriceDollars,
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

const FIELD_LABEL: Record<ProgramTextField, string> = {
  presenter: "Presenter",
  title: "Title",
  tagline: "Short line",
  description: "About",
  price: "Price",
};

const FIELD_MAX: Record<Exclude<ProgramTextField, "price">, number> = {
  presenter: 60,
  title: 80,
  tagline: 180,
  description: 2000,
};

type EditorContextValue = {
  mode: "view" | "edit";
  saving: boolean;
  drafts: ProgramEditItem[];
  fieldErrors: Record<string, string>;
  change: (id: string, field: ProgramTextField, value: string) => void;
};

const ProgramEditorContext = createContext<EditorContextValue | null>(null);

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
  const toolbar = (
    <div className={styles.toolbar} role="group" aria-label="Program editing" data-program-editor={state.mode} data-lead-editor={state.mode}>
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
  );
  const alert = state.mode === "edit" && state.message ? (
    <div className={`${styles.alert} ${styles.notice}`} role="alert">
      {state.message}
    </div>
  ) : null;
  const value: EditorContextValue = {
    mode: state.mode,
    saving: state.saving,
    drafts: state.drafts,
    fieldErrors: state.fieldErrors,
    change: (id, field, next) => dispatch({ type: "change", id, field, value: next }),
  };

  const body =
    state.mode === "edit" ? (
      <form
        className={styles.frame}
        onSubmit={(event) => {
          event.preventDefault();
          void onSave();
        }}
      >
        {children}
      </form>
    ) : (
      children
    );

  const dock = typeof document === "undefined" ? null : createPortal(
    <>
      {toolbar}
      {alert}
    </>,
    document.body,
  );
  return (
    <ProgramEditorContext.Provider value={value}>
      {dock}
      {align === "page" ? <div className={styles.reserve} aria-hidden="true" /> : null}
      {body}
    </ProgramEditorContext.Provider>
  );
}

export function EditableProgramText({
  lead,
  programId,
  field,
  as = "span",
  className,
  children,
}: {
  lead: boolean;
  programId: string;
  field: ProgramTextField;
  as?: "span" | "div" | "p" | "h1" | "h2" | "h3";
  className?: string;
  children: React.ReactNode;
}) {
  if (!lead) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }
  return (
    <ProgramText programId={programId} field={field} as={as} className={className}>
      {children}
    </ProgramText>
  );
}

function ProgramText({
  programId,
  field,
  as: Tag,
  className,
  children,
}: {
  programId: string;
  field: ProgramTextField;
  as: "span" | "div" | "p" | "h1" | "h2" | "h3";
  className?: string;
  children: React.ReactNode;
}) {
  const editor = useContext(ProgramEditorContext);
  const draft = editor?.drafts.find((item) => item.id === programId);
  if (!editor || !draft) {
    return <Tag className={className}>{children}</Tag>;
  }
  const read = readText(draft, field, children);
  if (editor.mode !== "edit" || !canType(draft, field)) {
    if (read == null) return null;
    return <Tag className={className}>{read}</Tag>;
  }
  const error = editor.fieldErrors[`${programId}.${field}`];
  const errorId = error ? `program-${programId}-${field}-error` : undefined;
  return (
    <Tag className={className}>
      <InPlaceField
        programId={programId}
        field={field}
        draft={draft}
        disabled={editor.saving}
        errorId={errorId}
        onChange={(value) => editor.change(programId, field, value)}
      />
      {error ? (
        <span className={styles.fieldError} id={errorId}>
          {error}
        </span>
      ) : null}
    </Tag>
  );
}

function InPlaceField({
  programId,
  field,
  draft,
  disabled,
  errorId,
  onChange,
}: {
  programId: string;
  field: ProgramTextField;
  draft: ProgramEditItem;
  disabled: boolean;
  errorId?: string;
  onChange: (value: string) => void;
}) {
  const id = `program-${programId}-${field}`;
  const invalid = errorId ? true : undefined;
  if (field === "price") {
    return (
      <span className={styles.priceLine}>
        <span aria-hidden="true">$</span>
        <input
          id={id}
          className={styles.price}
          value={draft.price}
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          aria-invalid={invalid}
          aria-describedby={errorId}
          onChange={(event) => onChange(event.target.value)}
        />
        {draft.priceCadence === "month" ? <span>/month</span> : null}
        <span>CAD</span>
        <label className={styles.sr} htmlFor={id}>
          {FIELD_LABEL.price}
        </label>
      </span>
    );
  }
  const value = draft[field];
  const shared = {
    id,
    value,
    disabled,
    maxLength: FIELD_MAX[field],
    autoComplete: "off" as const,
    "aria-invalid": invalid,
    "aria-describedby": errorId,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
  };
  const multiline = field === "title" || field === "tagline" || field === "description";
  return (
    <>
      <label className={styles.sr} htmlFor={id}>
        {FIELD_LABEL[field]}
      </label>
      {multiline ? (
        <GrowingText field={field} {...shared} />
      ) : (
        <input {...shared} className={styles.box} />
      )}
    </>
  );
}

function GrowingText({
  field,
  ...props
}: React.ComponentProps<"textarea"> & { field: ProgramTextField }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [props.value]);
  return <textarea {...props} ref={ref} rows={field === "description" ? 3 : 1} className={styles.box} />;
}

function canType(draft: ProgramEditItem, field: ProgramTextField) {
  if (field === "price") return draft.priceEditable;
  if (field === "description") return draft.kind === "detail";
  return true;
}

function readText(draft: ProgramEditItem, field: ProgramTextField, children: React.ReactNode) {
  if (field === "price") {
    if (!draft.priceEditable) return children;
    const parsed = parsePriceDollars(draft.price);
    if (!parsed.ok || parsed.cents == null) return null;
    return `${formatShownPrice(parsed.cents, draft.priceCadence)} CAD`;
  }
  if (field === "title") return draft.title;
  if (field === "tagline") return draft.tagline;
  if (field === "presenter") return draft.presenter;
  if (field === "description") return draft.description;
  return children;
}
