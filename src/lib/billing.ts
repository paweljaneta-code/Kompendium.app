import { currentUser } from "@clerk/nextjs/server";
import { getPlanByKey, plans, type PlanKey } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";

export type SubscriptionInfo = {
  hasSubscription: boolean;
  status: string | null;
  planKey: PlanKey | null;
  planName: string | null;
  monthlyPriceLabel: string | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due", "unpaid"]);

function planFromPriceId(priceId: string | null | undefined) {
  if (!priceId) return null;
  return plans.find((plan) => plan.stripePriceId === priceId) ?? null;
}

export async function getAuthedUserOrThrow() {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function getOrCreateCustomerForUser() {
  const user = await getAuthedUserOrThrow();
  const stripe = getStripe();
  const email = user.emailAddresses[0]?.emailAddress;

  if (!email) {
    throw new Error("User has no email");
  }

  const existing = await stripe.customers.list({
    email,
    limit: 1
  });

  const customer = existing.data[0];
  if (customer) {
    return {
      user,
      customer
    };
  }

  const created = await stripe.customers.create({
    email,
    name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || undefined,
    metadata: {
      clerkUserId: user.id
    }
  });

  return {
    user,
    customer: created
  };
}

export async function getSubscriptionForUser(): Promise<SubscriptionInfo> {
  const empty: SubscriptionInfo = {
    hasSubscription: false,
    status: null,
    planKey: null,
    planName: null,
    monthlyPriceLabel: null,
    currentPeriodEnd: null,
    trialEnd: null,
    cancelAtPeriodEnd: false
  };

  try {
    const { customer } = await getOrCreateCustomerForUser();
    const stripe = getStripe();

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 20,
      expand: ["data.items.data.price"]
    });

    const subscription = subscriptions.data.find((item) => ACTIVE_STATUSES.has(item.status));
    if (!subscription) {
      return empty;
    }

    const priceId = subscription.items.data[0]?.price?.id ?? null;
    const metadataPlanKey = subscription.metadata.planKey;
    const plan =
      (metadataPlanKey ? getPlanByKey(metadataPlanKey) : null) ?? planFromPriceId(priceId);

    return {
      hasSubscription: true,
      status: subscription.status,
      planKey: plan?.key ?? null,
      planName: plan?.name ?? null,
      monthlyPriceLabel: plan?.monthlyPriceLabel ?? null,
      currentPeriodEnd: subscription.items.data[0]?.current_period_end
        ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
        : null,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    };
  } catch {
    return empty;
  }
}
