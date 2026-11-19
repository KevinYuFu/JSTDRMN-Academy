import { NextResponse, type NextRequest } from "next/server";
import { requestNeedsLogin } from "@/lib/session-cookie";

export function proxy(request: NextRequest) {
  if (!requestNeedsLogin(request.headers.get("cookie"))) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/dashboard", "/teacher/:path*", "/checkout/:path*"],
};
