import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { toEntitlementRecords } from "@/lib/entitlements";
import { singleStudentCohortHref, staffRecordPath, studentStaffRedirect } from "@/lib/route-entry";
import { isStudent } from "@/lib/roles";
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
 * Next 16.4.6 deletes flight headers, including next-router-prefetch, before
 * the proxy sees the request (server/web/adapter.js). Purpose and Sec-Purpose
 * are not in that list, so only a browser speculative prefetch skips the read.
 */
function isPrefetch(request: NextRequest) {
  const purpose = `${request.headers.get("purpose") ?? ""} ${request.headers.get("sec-purpose") ?? ""}`;
  return purpose.includes("prefetch");
}

async function staffRecordExists(pathname: string) {
  const record = staffRecordPath(pathname);
  if (!record) return true;
  // Cache Components has already sent the shell before a request-time notFound(),
  // so the status stays 200. Reject the missing row here, before render.
  if (record.kind === "mentor") {
    const row = await prisma.mentor.findUnique({ where: { slug: record.slug }, select: { id: true } });
    return Boolean(row);
  }
  if (record.kind === "event") {
    const row = await prisma.event.findUnique({ where: { slug: record.slug }, select: { id: true } });
    return Boolean(row);
  }
  const row = await prisma.course.findUnique({ where: { slug: record.slug }, select: { id: true } });
  return Boolean(row);
}

type Entry = { kind: "redirect"; href: string } | { kind: "notFound" };

async function entryDestination(token: string, teacher: boolean, slug: string | null, pathname: string): Promise<Entry | null> {
  const session = await prisma.session.findUnique({
    where: { token },
    select: { expiresAt: true, user: { select: { id: true, role: true } } },
  });
  if (!session || session.expiresAt.getTime() < Date.now()) return null;
  if (teacher) {
    const href = studentStaffRedirect(session.user.role);
    if (href) return { kind: "redirect", href };
    if (!(await staffRecordExists(pathname))) return { kind: "notFound" };
    return null;
  }
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
  const href = singleStudentCohortHref(session.user.role, course, course.cohorts, toEntitlementRecords(rows));
  return href ? { kind: "redirect", href } : null;
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
  const destination = await entryDestination(token, teacher, slug, pathname);
  if (destination?.kind === "notFound") {
    // A plain 404 has no header. Rewrite into the page that already renders the site's not-found.
    return NextResponse.rewrite(new URL("/courses/_", request.url), { status: 404 });
  }
  if (!destination) return NextResponse.next();
  return NextResponse.redirect(new URL(destination.href, request.url));
}

export const config = {
  matcher: ["/dashboard", "/teacher/:path*", "/checkout/:path*", "/bootcamps/:slug"],
};
