import { createHash } from "crypto";

export type ResolvedVideo =
  | { type: "mock"; src: string }
  | { type: "iframe"; src: string }
  | { type: "file"; src: string };

/** Providers the lesson form and the player both read. Adding one is a row here plus a branch in resolveVideo. */
export const videoProviders = [
  { id: "drive", label: "Google Drive" },
  { id: "mock", label: "Mock player" },
  { id: "youtube", label: "YouTube URL" },
  { id: "vimeo", label: "Vimeo URL" },
  { id: "vimeo_private", label: "Vimeo (private, domain-restricted)" },
  { id: "bunny", label: "Bunny Stream" },
  { id: "file", label: "File URL" },
] as const;

/** New lessons start on Drive. Bunny Stream stays in the list as the planned upgrade. */
export const defaultVideoProvider = "drive";

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
  return null;
}

export function driveFileId(url: string): string | null {
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{25,}$/.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host !== "drive.google.com") return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    const fileAt = parts.indexOf("file");
    const fromPath = fileAt >= 0 && parts[fileAt + 1] === "d" ? parts[fileAt + 2] : null;
    if (fromPath && /^[a-zA-Z0-9_-]+$/.test(fromPath)) return fromPath;
    const fromQuery = parsed.searchParams.get("id");
    if (fromQuery && /^[a-zA-Z0-9_-]+$/.test(fromQuery)) return fromQuery;
  } catch {
    return null;
  }
  return null;
}

export function drivePreviewUrl(fileId: string) {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

export function bunnyVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (/^[A-Za-z0-9-]{8,}$/.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed);
    const last = parsed.pathname.split("/").filter(Boolean).pop();
    return last && /^[A-Za-z0-9-]{8,}$/.test(last) ? last : null;
  } catch {
    return null;
  }
}

/** Bunny Stream token auth: SHA256 hex of securityKey + videoId + expiration (unix seconds). */
export function bunnyToken(securityKey: string, videoId: string, expires: number) {
  return createHash("sha256").update(`${securityKey}${videoId}${expires}`).digest("hex");
}

function bunnyEmbed(url: string, nowMs: number): ResolvedVideo {
  const videoId = bunnyVideoId(url);
  if (!videoId) return { type: "mock", src: url };
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID?.trim();
  const key = process.env.BUNNY_STREAM_TOKEN_KEY?.trim();
  const library = libraryId || "library";
  if (!libraryId || !key) {
    return { type: "iframe", src: `https://iframe.mediadelivery.net/embed/${library}/${encodeURIComponent(videoId)}` };
  }
  const expires = Math.floor(nowMs / 1000) + 60 * 60;
  const token = bunnyToken(key, videoId, expires);
  return {
    type: "iframe",
    src: `https://iframe.mediadelivery.net/embed/${libraryId}/${encodeURIComponent(videoId)}?token=${token}&expires=${expires}`,
  };
}

/**
 * Video storage stays behind this switch.
 * drive embeds https://drive.google.com/file/d/<id>/preview. Share the file with student emails, not "anyone with the link".
 * vimeo_private uses the same player URL as vimeo. Privacy is a Vimeo domain restriction, not a secret in the URL.
 * bunny is the planned upgrade. It signs the embed only when BUNNY_STREAM_LIBRARY_ID and BUNNY_STREAM_TOKEN_KEY are set.
 */
export function resolveVideo(provider: string, url: string, nowMs = Date.now()): ResolvedVideo {
  if (provider === "file") return { type: "file", src: url };
  if (provider === "drive") {
    const id = driveFileId(url);
    return id ? { type: "iframe", src: drivePreviewUrl(id) } : { type: "mock", src: url };
  }
  if (provider === "youtube") {
    const id = youtubeId(url);
    return id ? { type: "iframe", src: `https://www.youtube.com/embed/${id}` } : { type: "mock", src: url };
  }
  if (provider === "vimeo" || provider === "vimeo_private") {
    const id = vimeoId(url);
    return id ? { type: "iframe", src: `https://player.vimeo.com/video/${id}` } : { type: "mock", src: url };
  }
  if (provider === "bunny") return bunnyEmbed(url, nowMs);
  return { type: "mock", src: url };
}

export function runtimeSeconds(label: string) {
  const parts = label.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return 60;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}
