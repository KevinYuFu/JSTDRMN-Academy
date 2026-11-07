import { programPriceLabel } from "./config";

export type PricedCourse = {
  access: string;
  priceCents: number | null;
  billing: string;
};

/** Live courses first, then on-demand courses. Order inside each group stays as given. */
export function programGroups<T extends { delivery: string }>(cards: T[]) {
  return [
    { title: "Live Programs", items: cards.filter((card) => card.delivery === "live") },
    { title: "Offline Programs", items: cards.filter((card) => card.delivery === "on_demand") },
  ].filter((group) => group.items.length > 0);
}

/**
 * Price stored on this course.
 * A shared intro plan is not repeated here. Headliner uses its own banner amount.
 */
export function enrollmentPrice(course: PricedCourse) {
  if (course.access === "headliner" || course.access === "open") return null;
  if (course.priceCents == null) return null;
  return programPriceLabel(course);
}
