export type IsolateDecision = "allow" | "contain" | "block" | "ignore";

const ACTIVATION_KEY = new Set(["Enter", " "]);

/** Decide what an in-edit event may do. Pure so the browser guard and tests share one rule. */
export function isolateEditAction(args: {
  type: string;
  key?: string;
  inField: boolean;
  inChrome: boolean;
  inLabel?: boolean;
}): IsolateDecision {
  if (args.type === "submit") return "block";
  if (args.inField || args.inLabel) {
    if (args.type === "click" || args.type === "auxclick") return "contain";
    return "ignore";
  }
  if (args.inChrome) return "allow";
  if (args.type === "click" || args.type === "auxclick") return "block";
  if ((args.type === "keydown" || args.type === "keyup") && args.key && ACTIVATION_KEY.has(args.key)) return "block";
  return "ignore";
}

function targetElement(event: Event): Element | null {
  const target = event.target;
  if (target instanceof Element) return target;
  if (target instanceof Node) return target.parentElement;
  return null;
}

export function applyEditIsolation(event: Event) {
  const element = targetElement(event);
  const decision = isolateEditAction({
    type: event.type,
    key: event instanceof KeyboardEvent ? event.key : undefined,
    inField: Boolean(element?.closest("input, textarea, select, option, [contenteditable='true']")),
    inChrome: Boolean(element?.closest("[data-lead-editor]")),
    inLabel: Boolean(element?.closest("label")),
  });
  if (decision === "contain") {
    event.stopPropagation();
    if ((event.type === "click" || event.type === "auxclick") && element?.closest("a, button")) {
      event.preventDefault();
    }
    return;
  }
  if (decision === "block") {
    event.preventDefault();
    event.stopPropagation();
  }
}

const GUARD_EVENTS = ["click", "auxclick", "keydown", "keyup", "submit"] as const;

export function bindEditIsolation(dirty: boolean) {
  const header = document.querySelector(".site-header");
  if (header instanceof HTMLElement) header.inert = true;
  const onEvent = (event: Event) => applyEditIsolation(event);
  for (const type of GUARD_EVENTS) document.addEventListener(type, onEvent, true);
  const onUnload = (event: BeforeUnloadEvent) => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = "";
  };
  if (dirty) window.addEventListener("beforeunload", onUnload);
  return () => {
    if (header instanceof HTMLElement) header.inert = false;
    for (const type of GUARD_EVENTS) document.removeEventListener(type, onEvent, true);
    window.removeEventListener("beforeunload", onUnload);
  };
}
