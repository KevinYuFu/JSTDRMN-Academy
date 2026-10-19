/** One item per line. Commas on a single line also split, so either habit works. */
export function parseMentorList(raw: string) {
  const lines = raw.split(/\n/).flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed) return [];
    if (trimmed.includes(",") && !trimmed.includes("\n")) {
      return trimmed.split(",").map((part) => part.trim()).filter(Boolean);
    }
    return [trimmed];
  });
  return lines.slice(0, 12).map((item) => item.slice(0, 80));
}

export function unpackMentorList(stored: string | null | undefined) {
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
  } catch {
    return parseMentorList(stored);
  }
  return [];
}

export function packMentorList(items: string[]) {
  return JSON.stringify(items);
}

export function mentorSlug(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "mentor";
}

export function mentorInitial(name: string) {
  const letter = name.trim().charAt(0).toUpperCase();
  return letter || "?";
}
