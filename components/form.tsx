"use client";

import { useCallback, useEffectEvent, useLayoutEffect, type ComponentProps } from "react";

export function useResetWhenHidden(reset: () => void) {
  const resetOnHide = useEffectEvent(reset);
  useLayoutEffect(() => {
    return () => {
      resetOnHide();
    };
  }, []);
}

export function Form(props: ComponentProps<"form">) {
  const ref = useCallback((form: HTMLFormElement | null) => {
    if (!form) return;
    return () => {
      form.reset();
    };
  }, []);
  return <form {...props} ref={ref} />;
}
