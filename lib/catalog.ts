import { prices } from "./config";
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

type OfferCourse = {
  id: string;
  slug: string;
  title: string;
  presenter: string | null;
  priceCents: number | null;
  access: string;
  billing: string;
};

export type OfferCourses = {
  findFirst(args: { where: { access: "headliner" }; orderBy: { sort: "asc" } }): Promise<OfferCourse | null>;
  findUnique(args: { where: { slug: string } }): Promise<OfferCourse | null>;
};

async function courseTable(): Promise<OfferCourses> {
  const { prisma } = await import("./db");
  return {
    findFirst: (args) => prisma.course.findFirst(args),
    findUnique: (args) => prisma.course.findUnique(args),
  };
}

/** Checkout reads the program row. Headliner is the only price that still comes from the environment. */
export async function resolveOffer(product: string, slug: string, courses?: OfferCourses): Promise<Offer | null> {
  const table = courses ?? (await courseTable());
  const asked = product === "course" || product === "ash" ? "program" : product;
  if (asked === "headliner" || slug === "headliner") {
    const course = await table.findFirst({ where: { access: "headliner" }, orderBy: { sort: "asc" } });
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
  const course = await table.findUnique({ where: { slug } });
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
