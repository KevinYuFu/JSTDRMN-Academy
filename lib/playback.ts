export type ResolvedVideo =
  | { type: "mock"; src: string }
  | { type: "iframe"; src: string }
  | { type: "file"; src: string };

export function runtimeSeconds(label: string) {
  const parts = label.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return 60;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}
