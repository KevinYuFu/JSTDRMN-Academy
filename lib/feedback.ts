export const submissionKinds = [
  { id: "mix", label: "Mix" },
  { id: "track", label: "Track" },
] as const;

export type SubmissionKind = (typeof submissionKinds)[number]["id"];

export function isSubmissionKind(value: string): value is SubmissionKind {
  return submissionKinds.some((kind) => kind.id === value);
}

export function submissionKindLabel(value: string) {
  return submissionKinds.find((kind) => kind.id === value)?.label ?? value;
}
