import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ModuleViewer } from "@/components/modules/ModuleViewer";

export const dynamic = "force-dynamic";

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

  return (
    <ModuleViewer
      title="Plan terapii — klient"
      src={`/api/plany/document?view=client&index=${rawIndex}`}
      fallbackHref="/plany"
    />
  );
}
