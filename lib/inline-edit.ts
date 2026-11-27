/**
 * Pure edit state for one inline editor.
 * The screen passes the data in and sends the save action. This file does not
 * touch the database, auth, or a server action.
 * Typing does not clear an error. The current editors work that way.
 */

export type SaveResult = { ok: true } | { ok: false; message: string; fieldErrors?: Record<string, string> };

export type InlineEditState<T> = {
  editing: boolean;
  saving: boolean;
  message: string | null;
  fieldErrors: Record<string, string>;
  draft: T;
  saved: T;
};

export type InlineEditEvent<T> =
  | { type: "edit" }
  | { type: "cancel" }
  | { type: "change"; update: (draft: T) => T }
  | { type: "saving" }
  | { type: "saved"; value: T }
  | { type: "failed"; message: string; fieldErrors?: Record<string, string> }
  | { type: "hide" };

export function createInlineEditState<T>(initial: T): InlineEditState<T> {
  return {
    editing: false,
    saving: false,
    message: null,
    fieldErrors: {},
    draft: initial,
    saved: initial,
  };
}

function cleared<T>(state: InlineEditState<T>, editing: boolean): InlineEditState<T> {
  return {
    ...state,
    editing,
    saving: false,
    message: null,
    fieldErrors: {},
    draft: state.saved,
  };
}

export function reduceInlineEdit<T>(state: InlineEditState<T>, event: InlineEditEvent<T>): InlineEditState<T> {
  switch (event.type) {
    case "edit":
      if (state.saving) return state;
      return { ...state, editing: true, draft: state.saved, message: null, fieldErrors: {} };
    case "cancel":
      if (state.saving) return state;
      return cleared(state, false);
    case "change":
      if (!state.editing || state.saving) return state;
      return { ...state, draft: event.update(state.draft) };
    case "saving":
      if (!state.editing || state.saving) return state;
      return { ...state, saving: true };
    case "saved":
      return {
        editing: false,
        saving: false,
        message: null,
        fieldErrors: {},
        draft: event.value,
        saved: event.value,
      };
    case "failed":
      if (!state.saving) return state;
      return {
        ...state,
        editing: true,
        saving: false,
        message: event.message,
        fieldErrors: event.fieldErrors ?? {},
      };
    case "hide":
      return cleared(state, false);
    default:
      return state;
  }
}
