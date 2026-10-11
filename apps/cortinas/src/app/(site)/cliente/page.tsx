import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@portafolio/core/projects";
import { getDb, schema } from "@/lib/db";
import { requireClient } from "@/lib/client-session";
import { logout } from "@/app/actions/client";
import { NewProjectForm } from "@/components/forms/ClientForms";
import { QuickQuote } from "@/components/QuickQuote";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mis proyectos — Cota" };

export default async function ClientHome({ searchParams }: { searchParams: Promise<{ enviado?: string }> }) {
  const { enviado } = await searchParams;
  const session = await requireClient();
  const db = getDb();
  const [client] = await db.select().from(schema.clients).where(eq(schema.clients.id, session.userId));
  // Proyectos con cantidad de cortinas (suma de cantidades de sus líneas).
  const projects = await db
    .select({
      id: schema.projects.id, name: schema.projects.name, reference: schema.projects.reference, status: schema.projects.status,
      updatedAt: schema.projects.updatedAt, district: schema.projects.district,
      windows: sql<number>`coalesce((select sum(quantity) from lines where lines.project_id = ${schema.projects.id}), 0)::int`,
    })
    .from(schema.projects)
    .where(eq(schema.projects.clientId, session.userId))
    .orderBy(desc(schema.projects.updatedAt));

  if (client?.kind === "particular") {
    const catalog = await getCatalog();
    return (
      <div className="mx-auto max-w-[1360px] px-5 pt-12 md:px-10" data-testid="particular-home">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
          <div>
            <p className="font-mono text-xs text-muted">Particular · {client.name}</p>
            <h1 className="mt-3 text-[3rem] leading-none">Mis solicitudes</h1>
          </div>
          <form action={logout}><button className="text-sm text-muted hover:text-ink">Salir</button></form>
        </div>
        {enviado && <p className="mt-6 border-l-2 border-accent pl-4" data-testid="sent-ok">Solicitud {enviado} enviada. Le respondemos en un día hábil.</p>}
        {projects.length > 0 && (
          <ul className="mt-4 divide-y divide-line border-b border-line">
            {projects.map((p) => (
              <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-3 py-4">
                <Link href={`/proyecto/${p.id}`} className="font-serif text-xl hover:text-blue">{p.name}</Link>
                <span className="font-mono text-xs text-muted">{p.reference} · {p.windows} cortinas · {p.updatedAt.toLocaleDateString("es-PE")}</span>
                <span className="text-blue">{PROJECT_STATUS_LABELS[p.status as ProjectStatus]}</span>
              </li>
            ))}
          </ul>
        )}
        <section className="mt-12">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-[2rem] leading-tight">{projects.length ? "Nueva solicitud" : "Su solicitud"}</h2>
            <Link href="/configurar" className="bg-ink px-4 py-2 text-sm text-paper" data-testid="wizard-cta">Configurar paso a paso</Link>
          </div>
          <QuickQuote catalog={catalog} defaults={{ name: client.name, email: client.email, phone: client.phone }} />
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1360px] px-5 pt-12 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="font-mono text-xs text-muted">Empresa · {client?.company}{client?.ruc ? ` · ${client.ruc}` : ""}</p>
          <h1 className="mt-3 text-[3rem] leading-none">Mis proyectos</h1>
        </div>
        <form action={logout}><button className="text-sm text-muted hover:text-ink">Salir</button></form>
      </div>

      {projects.length === 0 ? (
        <p className="mt-8 text-muted">Aún no tiene proyectos. Cree el primero abajo.</p>
      ) : (
        <table className="mt-4 w-full text-left text-[0.95rem]">
          <thead className="font-mono text-xs text-muted">
            <tr className="border-b border-line">
              <th className="py-3 font-normal">Ref.</th>
              <th className="py-3 font-normal">Proyecto</th>
              <th className="hidden py-3 font-normal md:table-cell">Distrito</th>
              <th className="py-3 text-right font-normal">Cortinas</th>
              <th className="py-3 pl-6 font-normal">Estado</th>
              <th className="hidden py-3 text-right font-normal md:table-cell">Actualizado</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-b border-line">
                <td className="py-4 font-mono text-xs text-muted">{p.reference}</td>
                <td className="py-4"><Link href={`/proyecto/${p.id}`} className="font-serif text-xl hover:text-blue">{p.name}</Link></td>
                <td className="hidden py-4 text-muted md:table-cell">{p.district}</td>
                <td className="py-4 text-right font-mono text-sm">{p.windows}</td>
                <td className="py-4 pl-6">
                  <span className={p.status === "borrador" ? "text-muted" : "text-blue"}>{PROJECT_STATUS_LABELS[p.status as ProjectStatus]}</span>
                </td>
                <td className="hidden py-4 text-right text-sm text-muted md:table-cell">{p.updatedAt.toLocaleDateString("es-PE")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <section className="mt-16 grid gap-8 md:grid-cols-12">
        <div className="md:col-span-4">
          <h2 className="text-[2rem] leading-tight">Nuevo proyecto</h2>
          <p className="mt-2 text-muted">Un proyecto por obra o pabellón. Después agrega ubicaciones, plano y ventanas.</p>
        </div>
        <div className="md:col-span-7 md:col-start-6"><NewProjectForm /></div>
      </section>
    </div>
  );
}
