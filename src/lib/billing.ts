import { currentUser } from "@clerk/nextjs/server";
import { getStripe } from "@/lib/stripe";

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
