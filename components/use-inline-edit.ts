"use client";

import { useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import { useResetWhenHidden } from "./form";
import { createInlineEditState, inlineEditCopy, reduceInlineEdit, type SaveResult } from "@/lib/inline-edit";

/**
 * Edit, cancel, and save for one inline editor.
 * `save` is passed in. This hook does not import a server action.
 */
export function useInlineEdit<T, I>({
  initial,
  save,
  toInput,
  isDirty,
  afterSave,
  refreshAfterSave = true,
}: {
  initial: T;
  save: (input: I) => Promise<SaveResult>;
  toInput: (draft: T) => I;
  isDirty: (draft: T, saved: T) => boolean;
  /** Value stored after a good save. Defaults to the draft that was sent. */
  afterSave?: (draft: T) => T;
  /** Reload the server page after a good save. The saved text is already in state. */
  refreshAfterSave?: boolean;
}) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reduceInlineEdit<T>, initial, createInlineEditState);
  useResetWhenHidden(() => dispatch({ type: "hide" }));
  const saveLock = useRef(false);

  function change(update: (draft: T) => T) {
    dispatch({ type: "change", update });
  }

  async function onSave() {
    if (saveLock.current || state.saving || !isDirty(state.draft, state.saved)) return;
    saveLock.current = true;
    const draft = state.draft;
    dispatch({ type: "saving" });
    try {
      const result = await save(toInput(draft));
      if (!result.ok) {
        dispatch({ type: "failed", message: result.message, fieldErrors: result.fieldErrors });
        return;
      }
      dispatch({ type: "saved", value: afterSave ? afterSave(draft) : draft });
      if (refreshAfterSave) router.refresh();
    } catch {
      dispatch({ type: "failed", message: inlineEditCopy.failed });
    } finally {
      saveLock.current = false;
    }
  }

  const dirty = isDirty(state.draft, state.saved);
  return {
    editing: state.editing,
    saving: state.saving,
    message: state.message,
    fieldErrors: state.fieldErrors,
    draft: state.draft,
    saved: state.saved,
    dirty,
    change,
    frame: {
      editing: state.editing,
      saving: state.saving,
      dirty,
      message: state.message,
      onEdit: () => dispatch({ type: "edit" }),
      onCancel: () => dispatch({ type: "cancel" }),
      onSave: () => void onSave(),
    },
  };
}
