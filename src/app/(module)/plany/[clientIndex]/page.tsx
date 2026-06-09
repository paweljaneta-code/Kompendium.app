import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ModuleViewer } from "@/components/modules/ModuleViewer";
import { getKompendiumPlannerDocument } from "@/lib/originalModules";

type PlannerClientPageProps = {
  params: Promise<{ clientIndex: string }>;
};

export const metadata: Metadata = {
  title: "Klient — Plan terapii",
  description: "Widok klienta w planerze terapii"
};

export default async function PlannerClientPage({ params }: PlannerClientPageProps) {
  const { clientIndex: rawIndex } = await params;
  if (!/^\d+$/.test(rawIndex)) {
    notFound();
  }

  const clientIndex = Number.parseInt(rawIndex, 10);
  const planner = await getKompendiumPlannerDocument({
    view: "client",
    clientIndex
  });

  if (!planner) {
    notFound();
  }

  return (
    <ModuleViewer
      title="Plan terapii — klient"
      document={planner.document}
      fallbackHref="/plany"
    />
  );
}
