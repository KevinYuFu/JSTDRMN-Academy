import { NextResponse } from "next/server";
import { fulfillCheckout, revokeByExternalId } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { stripeClient } from "@/lib/stripe";
import { syncContact } from "@/lib/hubspot";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ ok: true, skipped: true, mode: "mock" });
  }
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ ok: false, error: "Missing signature" }, { status: 400 });
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const checkoutId = session.metadata?.checkoutId;
    if (checkoutId) {
      const external = typeof session.subscription === "string" ? session.subscription : session.id;
      const checkout = await fulfillCheckout(checkoutId, external);
      if (checkout) {
        const user = await prisma.user.findUnique({ where: { id: checkout.userId } });
        if (user) {
          await syncContact({ email: user.email, name: user.name, extra: { academy_last_purchase: checkout.product } });
        }
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    await revokeByExternalId(event.data.object.id);
  }

  return NextResponse.json({ ok: true });
}
