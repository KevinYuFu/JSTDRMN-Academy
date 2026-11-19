export const SESSION_COOKIE = "jstdrmn_session";

export function dashboardRequestNeedsLogin(pathname: string, cookieHeader: string | null) {
  if (pathname !== "/dashboard") return false;
  return sessionValue(cookieHeader) === "";
}

function sessionValue(cookieHeader: string | null) {
  if (!cookieHeader) return "";
  for (const part of cookieHeader.split(";")) {
    const item = part.trim();
    const eq = item.indexOf("=");
    if (eq === -1) continue;
    if (item.slice(0, eq) !== SESSION_COOKIE) continue;
    return item.slice(eq + 1);
  }
  return "";
}
