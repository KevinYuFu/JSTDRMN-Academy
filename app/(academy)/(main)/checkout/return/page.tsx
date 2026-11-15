import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { fulfillCheckout } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { syncContact } from "@/lib/hubspot";
import { stripeClient } from "@/lib/stripe";

export const dynamic = "force-dynamic";

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
      const course = checkout.courseId ? await prisma.course.findUnique({ where: { id: checkout.courseId } }) : null;
      if (course) redirect(`/courses/${course.slug}?unlocked=1`);
    }
  }
  redirect("/dashboard");
}
