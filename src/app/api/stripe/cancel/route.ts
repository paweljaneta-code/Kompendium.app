import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { MONEY_BACK_DAYS } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";
import { getOrCreateCustomerForUser } from "@/lib/billing";

const DAY_MS = 24 * 60 * 60 * 1000;

function getRefundableIdsFromInvoice(invoice: Stripe.Invoice): { paymentIntent?: string; charge?: string } {
  const rows = invoice.payments?.data;
  if (!rows?.length) {
    return {};
  }

  const preferPaid = rows.filter((row) => row.status === "paid");
  const ordered = preferPaid.length ? preferPaid : rows;

  for (const row of ordered) {
    const pi = row.payment?.payment_intent;
    if (pi) {
      return { paymentIntent: typeof pi === "string" ? pi : pi.id };
    }
    const ch = row.payment?.charge;
    if (ch) {
      return { charge: typeof ch === "string" ? ch : ch.id };
    }
  }

  return {};
}

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { customer } = await getOrCreateCustomerForUser();
    const stripe = getStripe();

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 20
    });

    const activeLike = subscriptions.data.find(
      (subscription) =>
        subscription.status === "active" ||
        subscription.status === "trialing" ||
        subscription.status === "past_due" ||
        subscription.status === "unpaid"
    );

    if (!activeLike) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
    }

    await stripe.subscriptions.cancel(activeLike.id);

    const ageMs = Date.now() - user.createdAt;
    const isMoneyBackWindow = ageMs <= MONEY_BACK_DAYS * DAY_MS;
    let refunded = false;

    if (isMoneyBackWindow && activeLike.latest_invoice) {
      const invoiceId =
        typeof activeLike.latest_invoice === "string"
          ? activeLike.latest_invoice
          : activeLike.latest_invoice.id;

      const invoice = await stripe.invoices.retrieve(invoiceId, {
        expand: ["payments.data.payment.payment_intent", "payments.data.payment.charge"]
      });

      const { paymentIntent, charge } = getRefundableIdsFromInvoice(invoice);

      if (paymentIntent) {
        await stripe.refunds.create({
          payment_intent: paymentIntent
        });
        refunded = true;
      } else if (charge) {
        await stripe.refunds.create({
          charge
        });
        refunded = true;
      }
    }

    return NextResponse.json({
      canceled: true,
      refunded,
      refundPolicyDays: MONEY_BACK_DAYS
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cancellation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
