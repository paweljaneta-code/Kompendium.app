import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ModuleViewer } from "@/components/modules/ModuleViewer";
import {
  getOriginalModuleBySlug,
  getOriginalModuleDocument,
  getOriginalModulesList
} from "@/lib/originalModules";

export const dynamic = "force-dynamic";

type ModulePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const modules = await getOriginalModulesList();
  return modules.map((module) => ({ slug: module.slug }));
}

export async function generateMetadata({ params }: ModulePageProps): Promise<Metadata> {
  const { slug } = await params;
  const moduleData = await getOriginalModuleBySlug(slug);

  if (!moduleData) {
    return {
      title: "Modul nie znaleziony"
    };
  }

  return {
    title: moduleData.title,
    description: moduleData.subtitle || "Modul terapeutyczny"
  };
}

export default async function ModulePage({ params }: ModulePageProps) {
  const { slug } = await params;
  const moduleData = await getOriginalModuleDocument(slug);

  if (!moduleData) {
    notFound();
  }

  return (
    <ModuleViewer title={moduleData.title} document={moduleData.document} />
  );
}
