/**
 * Tablero de proyectos: una columna por estado. Filtro de texto en la URL (?q=).
 */
import Link from "next/link";
import { desc, eq, ilike, or } from "drizzle-orm";
import { formatMoney } from "@portafolio/core/pricing";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, summarizeProject } from "@portafolio/core/projects";
import { getDb, schema } from "@/lib/db";

export default async function Board({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const db = getDb();
  const P = schema.projects;
  const C = schema.clients;
  const rows = await db
    .select({ p: P, c: { name: C.name, company: C.company } })
    .from(P)
    .innerJoin(C, eq(C.id, P.clientId))
    .where(q ? or(ilike(P.name, `%${q}%`), ilike(P.reference, `%${q}%`), ilike(C.company, `%${q}%`), ilike(C.name, `%${q}%`)) : undefined)
    .orderBy(desc(P.updatedAt));
  const [lines, plans] = await Promise.all([
    db.select({ projectId: schema.lines.projectId, quantity: schema.lines.quantity, unitPrice: schema.lines.unitPrice, config: schema.lines.config, status: schema.lines.status }).from(schema.lines),
    db.select({ projectId: schema.plans.projectId }).from(schema.plans),
  ]);
  const stats = (id: number) => {
    const ls = lines.filter((l) => l.projectId === id);
    const s = summarizeProject(ls.map((l) => ({ locationName: "", productName: l.config?.modelName ?? null, quantity: l.quantity, unitPrice: l.config ? l.unitPrice : null })));
    return { ...s, observed: ls.filter((l) => l.status === "observada").length, hasPlan: plans.some((p) => p.projectId === id) };
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-6">
        <div>
          <h1 className="text-4xl">Proyectos</h1>
          <p className="mt-1 text-sm text-muted">{rows.length} proyectos · los más recientes primero</p>
        </div>
        <form className="flex items-end gap-3">
          <input name="q" defaultValue={q} placeholder="Buscar por cliente, nombre o referencia" className="w-72 border-b border-line bg-transparent py-1.5 text-sm outline-none focus:border-ink" />
          <button className="text-sm text-muted hover:text-ink">Buscar</button>
        </form>
      </div>
      <div className="mt-6 grid auto-cols-[minmax(240px,1fr)] grid-flow-col gap-0 overflow-x-auto" data-testid="board">
        {PROJECT_STATUSES.map((status, i) => {
          const list = rows.filter((r) => r.p.status === status);
          return (
            <section key={status} className={`min-h-[60vh] px-4 ${i ? "border-l border-line" : "pl-0"}`}>
              <h2 className="flex items-baseline justify-between border-b border-ink pb-2 text-xl">
                {PROJECT_STATUS_LABELS[status]}
                <span className="font-mono text-xs text-muted">{list.length}</span>
              </h2>
              <ul className="divide-y divide-line">
                {list.map(({ p, c }) => {
                  const s = stats(p.id);
                  return (
                    <li key={p.id}>
                      <Link href={`/admin/proyectos/${p.id}`} className="block py-3 hover:bg-white-stone/60">
                        <p className="font-mono text-[11px] text-muted">{p.reference} · {p.updatedAt.toLocaleDateString("es-PE")}</p>
                        <p className="mt-1 font-serif text-lg leading-tight">{p.name}</p>
                        <p className="text-sm text-muted">{c.company || `${c.name} (particular)`}</p>
                        <p className="mt-1.5 flex flex-wrap gap-x-3 font-mono text-[11px]">
                          <span>{s.windows} cortinas</span>
                          {s.total > 0 && <span>{formatMoney(s.total)}</span>}
                          {s.hasPlan && <span className="text-blue">Plano</span>}
                          {p.measurementRequest && <span className="text-blue">Medición</span>}
                          {s.observed > 0 && <span className="text-danger">{s.observed} obs.</span>}
                        </p>
                      </Link>
                    </li>
                  );
                })}
                {list.length === 0 && <li className="py-4 text-sm text-muted">—</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
