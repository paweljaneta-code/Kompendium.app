"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Show, SignInButton, useAuth } from "@clerk/nextjs";
import { MONEY_BACK_DAYS, PLAN_TRIAL_DAYS, plans, type PlanKey } from "@/lib/plans";

type BusyAction = "checkout" | null;

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Nieudana operacja");
  }
  return data;
}

export default function PricingPage() {
  const { isSignedIn } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  async function startCheckout(planKey: PlanKey) {
    try {
      setBusy("checkout");
      setMessage("");
      const data = await postJson<{ checkoutUrl: string }>("/api/stripe/checkout", { planKey });
      window.location.assign(data.checkoutUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udalo sie uruchomic platnosci");
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-10 sm:px-10 sm:py-14">
      <section className="rounded-3xl border border-[var(--card-border)] bg-white p-8 shadow-sm sm:p-10">
        <h1 className="text-3xl font-semibold text-gray-900 sm:text-4xl">
          Cennik subskrypcji
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)] sm:text-base">
          Kazdy nowy uzytkownik otrzymuje {PLAN_TRIAL_DAYS} dni darmowego okresu probnego.
          Jesli zrezygnujesz w ciagu {MONEY_BACK_DAYS} dni od rejestracji, mozesz otrzymac
          zwrot pieniedzy.
        </p>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.key}
            className="rounded-2xl border border-[var(--card-border)] bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-semibold text-gray-900">{plan.name}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{plan.description}</p>
            <p className="mt-4 text-2xl font-semibold text-gray-900">{plan.monthlyPriceLabel}</p>
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              {plan.features.map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>

            {mounted ? (
              <>
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button className="mt-6 w-full rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white">
                      Zaloguj i wybierz plan
                    </button>
                  </SignInButton>
                </Show>

                <Show when="signed-in">
                  <button
                    onClick={() => startCheckout(plan.key)}
                    disabled={busy !== null}
                    className="mt-6 w-full rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {busy === "checkout" ? "Przekierowanie..." : `Wybieram ${plan.name}`}
                  </button>
                </Show>
              </>
            ) : (
              <div className="mt-6 h-10 w-full rounded-xl bg-[var(--card-border)]/40" aria-hidden="true" />
            )}
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-2xl border border-[var(--card-border)] bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Porownanie planow</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-left">
                <th className="py-2 pr-4 font-semibold">Funkcja</th>
                <th className="py-2 pr-4 font-semibold">Basic</th>
                <th className="py-2 pr-4 font-semibold">Premium</th>
                <th className="py-2 font-semibold">MAX</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              <tr className="border-b border-[var(--card-border)]">
                <td className="py-2 pr-4">Dostep do modulow</td>
                <td className="py-2 pr-4">Podstawowy</td>
                <td className="py-2 pr-4">Rozszerzony</td>
                <td className="py-2">Pelny</td>
              </tr>
              <tr className="border-b border-[var(--card-border)]">
                <td className="py-2 pr-4">Handouty</td>
                <td className="py-2 pr-4">Wybrane</td>
                <td className="py-2 pr-4">Pelna biblioteka</td>
                <td className="py-2">Pelna + nowosci</td>
              </tr>
              <tr className="border-b border-[var(--card-border)]">
                <td className="py-2 pr-4">Wsparcie</td>
                <td className="py-2 pr-4">Email</td>
                <td className="py-2 pr-4">Priorytetowe</td>
                <td className="py-2">Premium</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Trial i money-back</td>
                <td className="py-2 pr-4" colSpan={3}>
                  {PLAN_TRIAL_DAYS} dni trial + zwrot do {MONEY_BACK_DAYS} dni od rejestracji
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {mounted && isSignedIn ? (
          <div className="mt-5">
            <Link
              href="/account/subscription"
              className="inline-flex rounded-xl border border-[var(--card-border)] bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Zarządzaj subskrypcją w koncie
            </Link>
          </div>
        ) : null}

        {message ? <p className="mt-4 text-sm text-gray-700">{message}</p> : null}
      </section>
    </main>
  );
}
