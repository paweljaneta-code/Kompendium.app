import type { Metadata } from "next";
import { ModuleViewer } from "@/components/modules/ModuleViewer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Plan terapii",
  description: "Planowanie terapii — klienci, sesje i ścieżki kliniczne"
};

export default function PlannerPage() {
  return (
    <ModuleViewer
      title="Plan terapii"
      src="/api/plany/document?view=list"
      fallbackHref="/"
    />
  );
}
