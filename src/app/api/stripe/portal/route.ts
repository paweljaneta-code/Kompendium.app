import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getOrCreateCustomerForUser } from "@/lib/billing";
import { getStripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { customer } = await getOrCreateCustomerForUser();
    const stripe = getStripe();
    const origin = new URL(req.url).origin;

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${origin}/account/subscription`
    });

    return NextResponse.json({ portalUrl: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Portal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
