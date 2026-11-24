import { homeForRole, isLead, isStaff } from "./roles";

type LiveSessionOptions<T extends { expiresAt: Date }> = {
  findSession: (token: string) => Promise<T | null>;
  /** Runs only when the row exists and its expiry is already past. The proxy omits this. */
  deleteSession?: (session: T) => Promise<unknown>;
  /** Fake clock for tests. Defaults to the current time. */
  now?: Date | number;
};

function clock(now?: Date | number) {
  if (typeof now === "number") return now;
  if (now instanceof Date) return now.getTime();
  // Callers that render a page read cookies or connection() before this.
  return Date.now();
}

/**
 * The one token-to-live-session check.
 * A row is live when it exists and its expiry is still at or after `now`.
 * An earlier expiry is signed out. Equal to `now` is still live (`<`, not `<=`).
 */
export async function findLiveSession<T extends { expiresAt: Date }>(
  token: string,
  { findSession, deleteSession, now }: LiveSessionOptions<T>,
): Promise<T | null> {
  const session = await findSession(token);
  if (!session) return null;
  if (session.expiresAt.getTime() < clock(now)) {
    if (deleteSession) await deleteSession(session);
    return null;
  }
  return session;
}

/** Staff stay on the page. Anyone else goes to their home. A missing role stays put. */
export function staffGate(role: string | null | undefined): { redirect: string } | null {
  if (!role || isStaff(role)) return null;
  return { redirect: homeForRole(role) };
}

/** Lead stays. Other staff return to the dashboard. Everyone else goes home. */
export function leadGate(role: string | null | undefined): { redirect: string } | null {
  if (isLead(role)) return null;
  if (isStaff(role)) return { redirect: "/teacher?skillTree=forbidden" };
  return { redirect: homeForRole(role) };
}
