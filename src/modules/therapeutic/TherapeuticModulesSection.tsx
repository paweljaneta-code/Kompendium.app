import { FeatureCard } from "@/components/landing/FeatureCard";
import { therapeuticModules } from "./data";

export function TherapeuticModulesSection() {
  return (
    <section className="mt-16">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
          Moduly terapeutyczne
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)] sm:text-base">
          Rozpocznij od jednego kroku. Kazdy modul zostal zaprojektowany tak,
          aby wspierac Cie lagodnie i systematycznie.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {therapeuticModules.map((module) => (
          <FeatureCard
            key={module.id}
            title={module.name}
            description={module.summary}
          />
        ))}
      </div>
    </section>
  );
}
