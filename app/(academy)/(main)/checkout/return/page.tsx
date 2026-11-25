import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { AFTER_PAYMENT_PATH, fulfillCheckout } from "@/lib/billing";
import { syncContact } from "@/lib/hubspot";
import { stripeClient } from "@/lib/stripe";

export const instant = false;

export default async function CheckoutReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; session_id?: string }>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  if (!query.checkout || !query.session_id) redirect("/dashboard");
  const stripe = stripeClient();
  if (!stripe) redirect("/dashboard");
  const session = await stripe.checkout.sessions.retrieve(query.session_id);
  if (session.metadata?.checkoutId !== query.checkout || session.metadata.userId !== user.id) redirect("/dashboard");
  if (session.status === "complete" || session.payment_status === "paid") {
    const subscription = session.subscription;
    const external = typeof subscription === "string" ? subscription : session.id;
    const checkout = await fulfillCheckout(query.checkout, external);
    if (checkout) {
      await syncContact({ email: user.email, name: user.name, extra: { academy_last_purchase: checkout.product } });
      redirect(AFTER_PAYMENT_PATH);
    }
  }
  redirect("/dashboard");
}
