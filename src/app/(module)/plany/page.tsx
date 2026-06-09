import type { Metadata } from "next";
import { ModuleViewer } from "@/components/modules/ModuleViewer";
import { getKompendiumPlannerDocument } from "@/lib/originalModules";

export const metadata: Metadata = {
  title: "Plan terapii",
  description: "Planowanie terapii — klienci, sesje i ścieżki kliniczne"
};

export default async function PlannerPage() {
  const planner = await getKompendiumPlannerDocument({ view: "list" });

  if (!planner) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center px-6">
        <p className="text-sm text-[var(--muted)]">
          Nie udało się wczytać planera z kompendium.html.
        </p>
      </main>
    );
  }

  return (
    <ModuleViewer
      title="Plan terapii"
      document={planner.document}
      fallbackHref="/"
    />
  );
}
