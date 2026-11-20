import { prices } from "./config";
import { prisma } from "./db";
import type { CourseAccess, Product } from "./entitlements";

export type Offer = {
  product: Product;
  courseId: string;
  slug: string;
  label: string;
  amountCents: number | null;
  cadence: "month" | "once";
  access: CourseAccess;
  href: string;
};

/** Checkout reads the program row. Headliner is the only price that still comes from the environment. */
export async function resolveOffer(product: string, slug: string): Promise<Offer | null> {
  const asked = product === "course" || product === "ash" ? "program" : product;
  if (asked === "headliner" || slug === "headliner") {
    const course = await prisma.course.findFirst({ where: { access: "headliner" }, orderBy: { sort: "asc" } });
    if (!course) return null;
    return {
      product: "headliner",
      courseId: course.id,
      slug: course.slug,
      label: course.title,
      amountCents: prices.headlinerMonthlyCents,
      cadence: "month",
      access: "headliner",
      href: "/headliner",
    };
  }
  if (asked !== "program" || !slug) return null;
  const course = await prisma.course.findUnique({ where: { slug } });
  if (!course) return null;
  if (course.access !== "purchase" && course.access !== "subscription") return null;
  if (course.billing !== "once" && course.billing !== "monthly") return null;
  return {
    product: "program",
    courseId: course.id,
    slug: course.slug,
    label: course.presenter ? `${course.presenter} presents ${course.title}` : course.title,
    amountCents: course.priceCents,
    cadence: course.billing === "monthly" ? "month" : "once",
    access: course.access,
    href: `/programs/${course.slug}`,
  };
}
