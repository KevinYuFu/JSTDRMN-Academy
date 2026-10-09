import Link from "next/link";
import { redirect } from "next/navigation";
import { startCheckout } from "@/app/actions";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { resolveOffer } from "@/lib/catalog";
import { formatCad, stripeLive } from "@/lib/config";
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
  const slug = query.slug || "";
  const offer = await resolveOffer(product, slug);
  if (!offer) redirect("/");
  let already = false;
  if (!isStaff(user.role)) {
    const decision = containerAccess({
      role: user.role,
      access: offer.access,
      courseId: offer.courseId,
      cohortId: null,
      entitlements: await entitlementRecords(user.id),
    });
    already = decision.allowed;
  }

  return (
    <>
      <AppHeader active="courses" />
      <main className="shell">
        <div className="auth-card" style={{ maxWidth: 520 }}>
          <h1>{offer.label}</h1>
          <p className="amount" style={{ color: "#fff2cc", fontSize: 22, margin: "8px 0 12px" }}>
            {formatCad(offer.amountCents, offer.cadence)} CAD
          </p>
          {query.canceled ? <div className="error">Checkout was canceled. Nothing was charged.</div> : null}
          {query.error === "price" ? (
            <div className="error">This price isn’t set yet. Headliner needs HEADLINER_PRICE_CENTS before live Stripe.</div>
          ) : null}
          {already || isStaff(user.role) ? (
            <p>
              This is already on your account. <Link href={offer.href}>Open it</Link>.
            </p>
          ) : (
            <>
              <p className="note" style={{ marginBottom: 16 }}>
                {stripeLive()
                  ? "You’ll continue to Stripe Checkout. Access is granted when the webhook confirms payment."
                  : "No Stripe secret is set, so this is a mock checkout. It grants access the same way the webhook will."}
              </p>
              <form action={startCheckout}>
                <input type="hidden" name="product" value={offer.product} />
                <input type="hidden" name="slug" value={offer.slug} />
                <Button type="submit">{stripeLive() ? "Continue to Stripe" : "Continue"}</Button>
              </form>
            </>
          )}
        </div>
      </main>
    </>
  );
}
