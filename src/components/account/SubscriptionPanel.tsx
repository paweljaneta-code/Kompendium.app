"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MONEY_BACK_DAYS, PLAN_TRIAL_DAYS, plans, type PlanKey } from "@/lib/plans";
import type { SubscriptionInfo } from "@/lib/billing";

type BusyAction = "checkout" | "portal" | "cancel" | null;

const STATUS_LABELS: Record<string, string> = {
  trialing: "Okres próbny",
  active: "Aktywna",
  past_due: "Zaległa płatność",
  unpaid: "Nieopłacona",
  canceled: "Anulowana"
};

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Nieudana operacja");
  }
  return data;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(iso));
}

export function SubscriptionPanel() {
  const searchParams = useSearchParams();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setMessage("Płatność zakończona pomyślnie. Twój plan powinien być aktywny za chwilę.");
    } else if (searchParams.get("canceled") === "true") {
      setMessage("Płatność została anulowana.");
    }
  }, [searchParams]);

  const loadSubscription = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/stripe/subscription");
      if (!res.ok) {
        throw new Error("Nie udało się pobrać statusu subskrypcji");
      }
      const data = (await res.json()) as SubscriptionInfo;
      setSubscription(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Błąd ładowania subskrypcji");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  async function startCheckout(planKey: PlanKey) {
    try {
      setBusy("checkout");
      setMessage("");
      const data = await postJson<{ checkoutUrl: string }>("/api/stripe/checkout", { planKey });
      window.location.assign(data.checkoutUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się uruchomić płatności");
      setBusy(null);
    }
  }

  async function openPortal() {
    try {
      setBusy("portal");
      setMessage("");
      const data = await postJson<{ portalUrl: string }>("/api/stripe/portal");
      window.location.assign(data.portalUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się otworzyć panelu Stripe");
      setBusy(null);
    }
  }

  async function cancelWithPolicy() {
    try {
      setBusy("cancel");
      setMessage("");
      const data = await postJson<{ canceled: boolean; refunded: boolean; refundPolicyDays: number }>(
        "/api/stripe/cancel"
      );
      setMessage(
        data.refunded
          ? `Subskrypcja anulowana i zwrot został zlecony (okno ${data.refundPolicyDays} dni).`
          : "Subskrypcja anulowana. Zwrot nie został zlecony (poza oknem money-back lub brak obciążenia)."
      );
      await loadSubscription();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się anulować subskrypcji");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-[var(--card-border)] bg-white p-8 shadow-sm">
        <p className="text-sm text-[var(--muted)]">Ładowanie subskrypcji…</p>
      </section>
    );
  }

  const statusLabel = subscription?.status
    ? (STATUS_LABELS[subscription.status] ?? subscription.status)
    : "Brak subskrypcji";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--card-border)] bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-gray-900">Aktualny plan</h2>

        {subscription?.hasSubscription ? (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--muted)]">Plan</dt>
              <dd className="mt-0.5 font-medium text-gray-900">
                {subscription.planName ?? "Nieznany plan"}
                {subscription.monthlyPriceLabel ? ` · ${subscription.monthlyPriceLabel}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Status</dt>
              <dd className="mt-0.5 font-medium text-gray-900">{statusLabel}</dd>
            </div>
            {subscription.status === "trialing" && subscription.trialEnd ? (
              <div>
                <dt className="text-[var(--muted)]">Koniec okresu próbnego</dt>
                <dd className="mt-0.5 font-medium text-gray-900">{formatDate(subscription.trialEnd)}</dd>
              </div>
            ) : null}
            {subscription.currentPeriodEnd ? (
              <div>
                <dt className="text-[var(--muted)]">
                  {subscription.cancelAtPeriodEnd ? "Aktywna do" : "Odnowienie"}
                </dt>
                <dd className="mt-0.5 font-medium text-gray-900">
                  {formatDate(subscription.currentPeriodEnd)}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted)]">
            Nie masz aktywnej subskrypcji. Wybierz plan poniżej — każdy nowy użytkownik otrzymuje{" "}
            {PLAN_TRIAL_DAYS} dni trialu.
          </p>
        )}

        {subscription?.cancelAtPeriodEnd ? (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Subskrypcja zostanie anulowana na koniec bieżącego okresu rozliczeniowego.
          </p>
        ) : null}

        {subscription?.hasSubscription ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={openPortal}
              disabled={busy !== null}
              className="rounded-xl border border-[var(--card-border)] bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-60"
            >
              {busy === "portal" ? "Otwieranie…" : "Metoda płatności i faktury"}
            </button>
            <button
              onClick={cancelWithPolicy}
              disabled={busy !== null}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-60"
            >
              {busy === "cancel" ? "Anulowanie…" : "Anuluj subskrypcję"}
            </button>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[var(--card-border)] bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-gray-900">
          {subscription?.hasSubscription ? "Zmień plan" : "Wybierz plan"}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {PLAN_TRIAL_DAYS} dni trialu · zwrot do {MONEY_BACK_DAYS} dni od rejestracji
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = subscription?.planKey === plan.key;
            return (
              <article
                key={plan.key}
                className={`rounded-xl border p-5 ${
                  isCurrent
                    ? "border-[var(--primary)] bg-[#f4f8f5]"
                    : "border-[var(--card-border)]"
                }`}
              >
                <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{plan.description}</p>
                <p className="mt-3 text-lg font-semibold text-gray-900">{plan.monthlyPriceLabel}</p>
                <button
                  onClick={() => startCheckout(plan.key)}
                  disabled={busy !== null || isCurrent}
                  className="mt-4 w-full rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {isCurrent
                    ? "Aktualny plan"
                    : busy === "checkout"
                      ? "Przekierowanie…"
                      : subscription?.hasSubscription
                        ? `Przejdź na ${plan.name}`
                        : `Wybieram ${plan.name}`}
                </button>
              </article>
            );
          })}
        </div>

        <p className="mt-4 text-sm text-[var(--muted)]">
          Szczegóły planów znajdziesz na stronie{" "}
          <Link href="/pricing" className="text-[#2a7a5a] underline underline-offset-2">
            Cennik
          </Link>
          .
        </p>
      </section>

      {message ? (
        <p className="rounded-xl border border-[var(--card-border)] bg-white px-4 py-3 text-sm text-gray-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}
