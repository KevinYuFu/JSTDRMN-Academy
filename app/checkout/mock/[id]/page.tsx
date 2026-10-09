import { notFound, redirect } from "next/navigation";
import { confirmMockPayment } from "@/app/actions";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { formatCad } from "@/lib/config";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MockCheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const checkout = await prisma.checkout.findUnique({ where: { id } });
  if (!checkout || checkout.userId !== user.id) notFound();
  if (checkout.status === "paid") redirect("/dashboard");
  const course = checkout.courseId ? await prisma.course.findUnique({ where: { id: checkout.courseId } }) : null;
  const cadence = course?.billing === "once" ? "once" : "month";
  return (
    <>
      <AppHeader active="courses" />
      <main className="shell">
        <div className="auth-card" style={{ maxWidth: 520 }}>
          <p className="note">Mock checkout</p>
          <h1 style={{ marginTop: 8 }}>{checkout.label}</h1>
          <p style={{ color: "#fff2cc", fontSize: 22, margin: "8px 0 12px" }}>
            {formatCad(checkout.amountCents, cadence)} CAD
          </p>
          <p className="note" style={{ marginBottom: 16 }}>
            Card ending 4242 is filled in for show. Nothing is sent to Stripe. Paying here marks the order paid and grants the seat.
          </p>
          <form action={confirmMockPayment}>
            <input type="hidden" name="checkoutId" value={checkout.id} />
            <Button type="submit">Pay {formatCad(checkout.amountCents, cadence)}</Button>
          </form>
        </div>
      </main>
    </>
  );
}
