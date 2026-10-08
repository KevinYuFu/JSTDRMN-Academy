function intEnv(name: string, fallback: number | null): number | null {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.round(value) : fallback;
}

/** Prices are CAD cents. Headliner stays null until Yu sets HEADLINER_PRICE_CENTS. */
export const prices = {
  currency: "cad" as const,
  headlinerMonthlyCents: intEnv("HEADLINER_PRICE_CENTS", null),
  courseCents: intEnv("COURSE_PRICE_CENTS", 5000) ?? 5000,
  ashMonthlyCents: intEnv("ASH_PRICE_CENTS", 5000) ?? 5000,
};

export const appUrl = process.env.APP_URL || "http://127.0.0.1:43123";

export const hubspotLinks = {
  site: "https://www.jstdrmn.com",
  about: "https://www.jstdrmn.com/about",
  community: "https://www.jstdrmn.com/community",
  showcases: "https://www.jstdrmn.com/showcases",
  label: "https://www.jstdrmn.com/label",
  management: "https://www.jstdrmn.com/management",
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

export function applyLink(slug: string) {
  if (slug === "production-bootcamp") return hubspotLinks.production;
  if (slug === "mashup-bootcamp") return hubspotLinks.mashup;
  return hubspotLinks.dj;
}
