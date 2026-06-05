import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getOrCreateCustomerForUser } from "@/lib/billing";
import { getPlanByKey, MONEY_BACK_DAYS, PLAN_TRIAL_DAYS } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planKey } = (await req.json()) as { planKey?: string };
    const plan = getPlanByKey(planKey ?? "");

    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (!plan.stripePriceId) {
      return NextResponse.json(
        { error: `Missing Stripe price id for ${plan.name}` },
        { status: 500 }
      );
    }

    const { customer, user } = await getOrCreateCustomerForUser();
    const stripe = getStripe();
    const origin = new URL(req.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      payment_method_types: ["card"],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1
        }
      ],
      success_url: `${origin}/account/subscription?success=true`,
      cancel_url: `${origin}/account/subscription?canceled=true`,
      allow_promotion_codes: true,
      metadata: {
        clerkUserId: user.id,
        planKey: plan.key,
        trialDays: String(PLAN_TRIAL_DAYS),
        moneyBackDays: String(MONEY_BACK_DAYS)
      },
      subscription_data: {
        trial_period_days: PLAN_TRIAL_DAYS,
        metadata: {
          clerkUserId: user.id,
          planKey: plan.key
        }
      }
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
