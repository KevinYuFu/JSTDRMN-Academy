import { NextResponse, type NextRequest } from "next/server";
import { dashboardRequestNeedsLogin } from "@/lib/session-cookie";

export function proxy(request: NextRequest) {
  if (!dashboardRequestNeedsLogin(request.nextUrl.pathname, request.headers.get("cookie"))) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: "/dashboard",
};
