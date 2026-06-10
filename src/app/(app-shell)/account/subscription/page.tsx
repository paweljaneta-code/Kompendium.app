import { Suspense } from "react";
import { SubscriptionPanel } from "@/components/account/SubscriptionPanel";

export default function SubscriptionPage() {
  return (
    <Suspense
      fallback={
        <section className="rounded-2xl border border-[var(--card-border)] bg-white p-8 shadow-sm">
          <p className="text-sm text-[var(--muted)]">Ładowanie subskrypcji…</p>
        </section>
      }
    >
      <SubscriptionPanel />
    </Suspense>
  );
}
