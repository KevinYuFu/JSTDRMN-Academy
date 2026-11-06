import { programPriceLabel } from "./config";

export type PricedCourse = {
  access: string;
  priceCents: number | null;
  billing: string;
};

/** Words shown on a program card. Live classes do not pick up the Subscription badge. */
export function programBadges(course: { delivery: string; setting: string; access: string }) {
  const badges: string[] = [];
  if (course.delivery === "live") badges.push("Live");
  else if (course.delivery === "on_demand") badges.push("On-demand");
  if (course.setting === "in_person") badges.push("In person");
  else if (course.setting === "online") badges.push("Online");
  else if (course.setting === "hybrid") badges.push("Hybrid");
  if (course.access === "open") badges.push("Free");
  else if (course.access === "subscription") badges.push("Subscription");
  return badges;
}

/** Skip a status tag that repeats a badge. "Waitlist Open" and "Price not confirmed" still show. */
export function showStatusLabel(statusLabel: string, badges: string[]) {
  return statusLabel.trim() !== "" && !badges.includes(statusLabel);
}

/**
 * A course with its own price uses that price.
 * A subscription course with no price uses the shared plan price.
 * Free courses stay unlabeled so they do not look like a separate charge.
 */
export function displayPrice(course: PricedCourse, plan: PricedCourse | null) {
  const own = programPriceLabel(course);
  if (own) return own;
  if (course.access !== "subscription" || !plan) return null;
  return programPriceLabel(plan);
}
