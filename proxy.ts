import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeProduct, type EntitlementRecord } from "@/lib/entitlements";
import { singleStudentCohortHref, studentStaffRedirect } from "@/lib/route-entry";
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

function recordsFrom(
  rows: { product: string; courseId: string | null; cohortId: string | null; status: string; endsAt: Date | null }[],
) {
  const records: EntitlementRecord[] = [];
  for (const row of rows) {
    const product = normalizeProduct(row.product);
    if (!product) continue;
    records.push({
      product,
      courseId: row.courseId,
      cohortId: row.cohortId,
      status: row.status === "active" ? "active" : "revoked",
      endsAt: row.endsAt,
    });
  }
  return records;
}

async function entryDestination(token: string, pathname: string) {
  const session = await prisma.session.findUnique({
    where: { token },
    select: { expiresAt: true, user: { select: { id: true, role: true } } },
  });
  if (!session || session.expiresAt.getTime() < Date.now()) {
    if (session) await prisma.session.deleteMany({ where: { token } });
    return needsLogin(pathname) ? "/login" : null;
  }
  if (pathname === "/teacher" || pathname.startsWith("/teacher/")) return studentStaffRedirect(session.user.role);
  const slug = bootcampSlug(pathname);
  if (!slug || session.user.role !== "student") return null;
  const course = await prisma.course.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      access: true,
      cohorts: { select: { id: true, slug: true }, orderBy: { sort: "asc" } },
    },
  });
  if (!course || course.access !== "cohort") return null;
  const rows = await prisma.entitlement.findMany({
    where: { userId: session.user.id },
    select: { product: true, courseId: true, cohortId: true, status: true, endsAt: true },
  });
  return singleStudentCohortHref(session.user.role, course, course.cohorts, recordsFrom(rows));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (needsLogin(pathname) && requestNeedsLogin(request.headers.get("cookie"))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const token = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const slug = bootcampSlug(pathname);
  const teacher = pathname === "/teacher" || pathname.startsWith("/teacher/");
  if (!token || (!teacher && !slug)) return NextResponse.next();
  const destination = await entryDestination(token, pathname);
  if (!destination) return NextResponse.next();
  return NextResponse.redirect(new URL(destination, request.url));
}

export const config = {
  matcher: ["/dashboard", "/teacher/:path*", "/checkout/:path*", "/bootcamps/:slug"],
};
