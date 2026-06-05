import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSubscriptionForUser } from "@/lib/billing";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await getSubscriptionForUser();
    return NextResponse.json(subscription);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Subscription error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
