import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getCatalog } from "@/lib/catalog";
import { getClientSession } from "@/lib/client-session";
import { ConfigWizard } from "@/components/ConfigWizard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Configurar paso a paso — Cota" };

export default async function Page({ searchParams }: { searchParams: Promise<{ categoria?: string; modelo?: string; proyecto?: string }> }) {
  const sp = await searchParams;
  const [catalog, session] = await Promise.all([getCatalog(), getClientSession()]);
  const projects = session
    ? await getDb().select({ id: schema.projects.id, name: schema.projects.name }).from(schema.projects)
        .where(and(eq(schema.projects.clientId, session.userId), eq(schema.projects.status, "borrador")))
    : [];
  const modelo = catalog.models.find((m) => m.slug === sp.modelo || String(m.id) === sp.modelo);
  return (
    <div className="px-5 pb-20 pt-10 md:px-10">
      <ConfigWizard catalog={catalog} projects={projects} loggedIn={!!session}
        initial={{ familyId: Number(sp.categoria) || undefined, modelId: modelo?.id, projectId: projects.find((p) => String(p.id) === sp.proyecto)?.id }} />
    </div>
  );
}
