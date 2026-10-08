export type ResolvedVideo =
  | { type: "mock"; src: string }
  | { type: "iframe"; src: string }
  | { type: "file"; src: string };

export function youtubeId(url: string): string | null {
  const trimmed = url.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const fromQuery = parsed.searchParams.get("v");
      if (fromQuery && /^[\w-]{11}$/.test(fromQuery)) return fromQuery;
      const parts = parsed.pathname.split("/").filter(Boolean);
      if ((parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") && parts[1] && /^[\w-]{11}$/.test(parts[1])) {
        return parts[1];
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function vimeoId(url: string): string | null {
  const trimmed = url.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host !== "vimeo.com" && host !== "player.vimeo.com") return null;
    const part = parsed.pathname.split("/").filter((segment) => /^\d+$/.test(segment)).pop();
    return part ?? null;
  } catch {
    return null;
  }
}

/** Video storage stays behind this switch so a DRM host can replace it later. */
export function resolveVideo(provider: string, url: string): ResolvedVideo {
  if (provider === "file") return { type: "file", src: url };
  if (provider === "youtube") {
    const id = youtubeId(url);
    return id ? { type: "iframe", src: `https://www.youtube.com/embed/${id}` } : { type: "mock", src: url };
  }
  if (provider === "vimeo") {
    const id = vimeoId(url);
    return id ? { type: "iframe", src: `https://player.vimeo.com/video/${id}` } : { type: "mock", src: url };
  }
  return { type: "mock", src: url };
}

export function runtimeSeconds(label: string) {
  const parts = label.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return 60;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}
