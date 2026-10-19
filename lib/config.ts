function intEnv(name: string, fallback: number | null): number | null {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.round(value) : fallback;
}

/** Headliner stays null until Yu sets HEADLINER_PRICE_CENTS. Other programs store priceCents on the course row. */
export const prices = {
  currency: "cad" as const,
  headlinerMonthlyCents: intEnv("HEADLINER_PRICE_CENTS", null),
};

export const appUrl = process.env.APP_URL || "http://127.0.0.1:43123";

/** Bootcamp apply URLs on the HubSpot marketing site. The academy menu does not use these. */
export const hubspotLinks = {
  site: "https://www.jstdrmn.com",
  dj: process.env.HUBSPOT_DJ_BOOTCAMP_URL || "https://www.jstdrmn.com/bootcamp",
  production: process.env.HUBSPOT_PRODUCTION_BOOTCAMP_URL || "https://www.jstdrmn.com/bootcamp",
  mashup: process.env.HUBSPOT_MASHUP_BOOTCAMP_URL || "https://www.jstdrmn.com/bootcamp",
};

export function formatCad(cents: number | null, cadence?: "month" | "once") {
  if (cents === null) return cadence === "month" ? "$X/month" : "$X";
  const amount = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
  return cadence === "month" ? `${amount}/month` : amount;
}

export function stripeLive() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function hubspotApplyUrl(url: string | null | undefined) {
  return url || hubspotLinks.dj;
}

/** Null hides the price. Headliner reads the env placeholder. Everything else reads the program record. */
export function programPriceLabel(course: { access: string; priceCents: number | null; billing: string }) {
  if (course.access === "headliner") return formatCad(prices.headlinerMonthlyCents, "month");
  if (course.priceCents == null) return null;
  if (course.billing === "monthly") return formatCad(course.priceCents, "month");
  if (course.billing === "once") return formatCad(course.priceCents);
  return null;
}
