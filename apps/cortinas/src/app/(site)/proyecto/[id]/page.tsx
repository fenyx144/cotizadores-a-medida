import { notFound } from "next/navigation";
import { requireClient } from "@/lib/client-session";
import { loadProject } from "@/lib/project";
import { getCatalog } from "@/lib/catalog";
import { ProjectEditor } from "@/components/project/ProjectEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mi proyecto — Cota" };

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab } = await searchParams;
  const session = await requireClient(`/proyecto/${id}`);
  const data = await loadProject(Number(id));
  if (!data || data.project.clientId !== session.userId) notFound();
  const catalog = await getCatalog();
  const initialTab = tab === "ubicaciones" || tab === "plano" || tab === "importar" || tab === "resumen" ? tab : undefined;
  return <ProjectEditor initial={data} catalog={catalog} initialTab={initialTab} />;
}
