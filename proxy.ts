import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { toEntitlementRecords } from "@/lib/entitlements";
import { isStudent, singleStudentCohortHref, studentStaffRedirect } from "@/lib/route-entry";
import { requestNeedsLogin, SESSION_COOKIE } from "@/lib/session-cookie";

function needsLogin(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname === "/teacher" ||
    pathname.startsWith("/teacher/") ||
    pathname === "/checkout" ||
    pathname.startsWith("/checkout/")
  );
}

function bootcampSlug(pathname: string) {
  const parts = pathname.split("/");
  if (parts.length !== 3 || parts[1] !== "bootcamps" || !parts[2]) return null;
  return parts[2];
}

/**
 * Next removes its own prefetch headers before the proxy runs, so a Next
 * prefetch cannot be told apart from a navigation. A browser speculative
 * prefetch still sends Purpose or Sec-Purpose, and that one does not need a 307.
 */
function isPrefetch(request: NextRequest) {
  const purpose = `${request.headers.get("purpose") ?? ""} ${request.headers.get("sec-purpose") ?? ""}`;
  return purpose.includes("prefetch");
}

async function entryDestination(token: string, teacher: boolean, slug: string | null) {
  const session = await prisma.session.findUnique({
    where: { token },
    select: { expiresAt: true, user: { select: { id: true, role: true } } },
  });
  if (!session || session.expiresAt.getTime() < Date.now()) return null;
  if (teacher) return studentStaffRedirect(session.user.role);
  if (!slug || !isStudent(session.user.role)) return null;
  // The proxy cannot call the cached readers in lib/content: 'use cache' does not
  // run here, and that cache can keep a cohort list for about an hour. The redirect
  // needs the rows that exist now. Only the id, slug, and access are read.
  const course = await prisma.course.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      access: true,
      cohorts: { select: { id: true, slug: true } },
    },
  });
  if (!course || course.access !== "cohort") return null;
  const rows = await prisma.entitlement.findMany({
    where: { userId: session.user.id, product: "cohort" },
    select: { product: true, courseId: true, cohortId: true, status: true, endsAt: true },
  });
  return singleStudentCohortHref(session.user.role, course, course.cohorts, toEntitlementRecords(rows));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (needsLogin(pathname) && requestNeedsLogin(request.headers.get("cookie"))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isPrefetch(request)) return NextResponse.next();
  const token = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const teacher = pathname === "/teacher" || pathname.startsWith("/teacher/");
  const slug = bootcampSlug(pathname);
  if (!token || (!teacher && !slug)) return NextResponse.next();
  const destination = await entryDestination(token, teacher, slug);
  if (!destination) return NextResponse.next();
  return NextResponse.redirect(new URL(destination, request.url));
}

export const config = {
  matcher: ["/dashboard", "/teacher/:path*", "/checkout/:path*", "/bootcamps/:slug"],
};
