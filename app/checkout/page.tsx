import Link from "next/link";
import { redirect } from "next/navigation";
import { startCheckout } from "@/app/actions";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { formatCad, prices, stripeLive } from "@/lib/config";
import { prisma } from "@/lib/db";
import { containerAccess, isStaff } from "@/lib/entitlements";
import { entitlementRecords } from "@/lib/learn";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; slug?: string; error?: string; canceled?: string }>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const product = query.product || "";
  const slug = query.slug || (product === "course" ? "club-mixing" : product === "ash" ? "ash-f-b2b" : "");
  let title = "";
  let amount: number | null = null;
  let cadence: "month" | "once" = "once";
  let href = "/dashboard";
  let already = false;

  if (product === "headliner") {
    title = "Headliner";
    amount = prices.headlinerMonthlyCents;
    cadence = "month";
    href = "/courses/tutorials";
    const course = await prisma.course.findUnique({ where: { slug: "tutorials" } });
    if (course && !isStaff(user.role)) {
      const decision = containerAccess({
        role: user.role,
        access: "headliner",
        courseId: course.id,
        cohortId: null,
        entitlements: await entitlementRecords(user.id),
      });
      already = decision.allowed;
    }
  } else if (product === "course" || product === "ash") {
    const course = await prisma.course.findUnique({ where: { slug } });
    if (!course) redirect("/#pricing");
    title = course.title;
    amount = product === "ash" ? prices.ashMonthlyCents : prices.courseCents;
    cadence = product === "ash" ? "month" : "once";
    href = `/courses/${course.slug}`;
    if (!isStaff(user.role)) {
      const decision = containerAccess({
        role: user.role,
        access: product === "ash" ? "ash_subscription" : "purchase",
        courseId: course.id,
        cohortId: null,
        entitlements: await entitlementRecords(user.id),
      });
      already = decision.allowed;
    }
  } else {
    redirect("/#pricing");
  }

  return (
    <>
      <AppHeader active="courses" />
      <main className="shell">
        <div className="auth-card" style={{ maxWidth: 520 }}>
          <h1>{title}</h1>
          <p className="amount" style={{ color: "#fff2cc", fontSize: 22, margin: "8px 0 12px" }}>
            {formatCad(amount, cadence === "month" ? "month" : "once")} CAD
          </p>
          {query.canceled ? <div className="error">Checkout was canceled. Nothing was charged.</div> : null}
          {query.error === "price" ? (
            <div className="error">Headliner doesn’t have a price yet. Set HEADLINER_PRICE_CENTS before using live Stripe.</div>
          ) : null}
          {already || isStaff(user.role) ? (
            <p>
              This is already on your account. <Link href={href}>Open it</Link>.
            </p>
          ) : (
            <>
              <p className="note" style={{ marginBottom: 16 }}>
                {stripeLive()
                  ? "You’ll continue to Stripe Checkout. Access is granted when the webhook confirms payment."
                  : "No Stripe secret is set, so this is a mock checkout. It grants access the same way the webhook will."}
              </p>
              <form action={startCheckout}>
                <input type="hidden" name="product" value={product} />
                <input type="hidden" name="slug" value={slug} />
                <Button type="submit">{stripeLive() ? "Continue to Stripe" : "Continue"}</Button>
              </form>
            </>
          )}
        </div>
      </main>
    </>
  );
}
