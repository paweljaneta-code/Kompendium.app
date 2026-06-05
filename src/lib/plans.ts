export type PlanKey = "basic" | "premium" | "max";

export type PlanDefinition = {
  key: PlanKey;
  name: string;
  description: string;
  monthlyPriceLabel: string;
  features: string[];
  stripePriceId: string;
};

export const PLAN_TRIAL_DAYS = 7;
export const MONEY_BACK_DAYS = 14;

export const plans: PlanDefinition[] = [
  {
    key: "basic",
    name: "Basic",
    description: "Start i codzienna praca z najwazniejszymi modulami.",
    monthlyPriceLabel: "39 PLN / mies.",
    stripePriceId: process.env.STRIPE_PRICE_BASIC ?? "",
    features: [
      "Dostep do bazowych modulow terapeutycznych",
      "Podstawowe handouty i notatki",
      "Wsparcie email"
    ]
  },
  {
    key: "premium",
    name: "Premium",
    description: "Rozszerzone narzedzia i zaawansowane scenariusze pracy.",
    monthlyPriceLabel: "79 PLN / mies.",
    stripePriceId: process.env.STRIPE_PRICE_PREMIUM ?? "",
    features: [
      "Wszystko z Basic",
      "Zaawansowane moduly i protokoly",
      "Pelna biblioteka handoutow",
      "Priorytetowe wsparcie"
    ]
  },
  {
    key: "max",
    name: "MAX",
    description: "Pelny pakiet dla profesjonalistow i zespolow.",
    monthlyPriceLabel: "129 PLN / mies.",
    stripePriceId: process.env.STRIPE_PRICE_MAX ?? "",
    features: [
      "Wszystko z Premium",
      "Najszybszy dostep do nowych funkcji",
      "Zaawansowane raporty i eksport",
      "Wsparcie premium"
    ]
  }
];

export function getPlanByKey(key: string) {
  return plans.find((plan) => plan.key === key);
}
