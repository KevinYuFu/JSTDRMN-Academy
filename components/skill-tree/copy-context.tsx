"use client";

import { createContext, useContext } from "react";
import styles from "@/components/program-editor.module.css";

type SkillCopyContextValue = {
  editing: boolean;
  value: (path: string, fallback: string) => string;
  change: (path: string, value: string) => void;
  error: (path: string) => string | undefined;
};

export const SkillCopyContext = createContext<SkillCopyContextValue | null>(null);

export function useSkillCopy() {
  return useContext(SkillCopyContext);
}

export function SkillCopyLine({
  path,
  text,
  className,
  label,
}: {
  path: string;
  text: string;
  className?: string;
  label: string;
}) {
  const edit = useSkillCopy();
  if (!edit?.editing) return <span className={className}>{text}</span>;
  const value = edit.value(path, text);
  const error = edit.error(path);
  return (
    <span className={className}>
      <textarea
        className={styles.box}
        aria-label={label}
        rows={1}
        value={value}
        onChange={(event) => edit.change(path, event.target.value)}
      />
      {error ? <span className={styles.fieldError}>{error}</span> : null}
    </span>
  );
}
