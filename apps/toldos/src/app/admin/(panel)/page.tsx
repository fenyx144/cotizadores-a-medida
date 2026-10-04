/**
 * Tablero de solicitudes: una columna por estado, con filtros por texto,
 * zona y tipo de producto (los filtros viajan en la URL: ?q=&zona=&tipo=).
 */
import Link from "next/link";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { formatEuro, formatMeters } from "@portafolio/core/pricing";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@portafolio/core/leads";
import { getDb, schema } from "@/lib/db";
import { TYPE_LABELS } from "@/lib/content";

export default async function LeadsBoard({ searchParams }: { searchParams: Promise<{ q?: string; zona?: string; tipo?: string }> }) {
  const { q = "", zona = "", tipo = "" } = await searchParams;
  const db = getDb();
  const L = schema.leads;

  const filters: SQL[] = [];
  if (q) filters.push(or(ilike(L.name, `%${q}%`), ilike(L.email, `%${q}%`), ilike(L.reference, `%${q}%`), ilike(L.city, `%${q}%`))!);
  if (zona) filters.push(eq(L.zoneName, zona));
  if (tipo) filters.push(sql`${L.configuration}->>'modelType' = ${tipo}`);

  const [leads, zones] = await Promise.all([
    db.select().from(L).where(filters.length ? and(...filters) : undefined).orderBy(desc(L.createdAt)),
    db.selectDistinct({ name: L.zoneName }).from(L),
  ]);
  const filtered = q || zona || tipo;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-6">
        <div>
          <h1 className="font-serif text-3xl">Solicitudes</h1>
          <p className="mt-1 text-sm text-muted">{leads.length} {filtered ? "con estos filtros" : "en total"}</p>
        </div>
        <form className="flex flex-wrap items-end gap-4 text-sm">
          <input name="q" defaultValue={q} placeholder="Buscar nombre, ciudad, referencia…" className="w-64 border-b border-line bg-transparent py-1.5 focus:border-ink focus:outline-none" />
          <select name="zona" defaultValue={zona} className="border-b border-line bg-transparent py-1.5">
            <option value="">Todas las zonas</option>
            {zones.filter((z) => z.name).map((z) => <option key={z.name} value={z.name!}>{z.name}</option>)}
          </select>
          <select name="tipo" defaultValue={tipo} className="border-b border-line bg-transparent py-1.5">
            <option value="">Todos los productos</option>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button className="bg-ink px-4 py-2 text-paper">Filtrar</button>
          {filtered && <Link href="/admin" className="text-muted underline underline-offset-4">Quitar filtros</Link>}
        </form>
      </div>

      <div className="mt-8 grid gap-8 overflow-x-auto md:grid-cols-5 md:gap-0">
        {LEAD_STATUSES.map((status, i) => {
          const items = leads.filter((l) => l.status === status);
          return (
            <section key={status} className={`min-w-[200px] md:px-4 ${i > 0 ? "md:border-l md:border-line" : "md:pl-0"}`}>
              <h2 className="flex items-baseline justify-between border-b border-ink pb-2 text-sm">
                <span className={status === "nuevo" ? "text-terracotta" : ""}>{LEAD_STATUS_LABELS[status]}</span>
                <span className="text-muted">{items.length}</span>
              </h2>
              <ul>
                {items.map((l) => (
                  <li key={l.id} className="border-b border-line/70">
                    <Link href={`/admin/leads/${l.id}`} className="group block py-4">
                      <p className="font-serif text-lg leading-tight group-hover:underline group-hover:underline-offset-4">{l.name}</p>
                      <p className="mt-1 text-xs text-muted">{l.reference} · {l.city}</p>
                      {l.configuration && (
                        <p className="mt-2 text-sm">
                          {l.configuration.modelName} · {formatMeters(l.configuration.width)} × {formatMeters(l.configuration.projection)}
                        </p>
                      )}
                      <p className="mt-1 flex justify-between text-xs text-muted">
                        <span>{l.estimatedPrice ? formatEuro(l.estimatedPrice) : "Sin diseño"}</span>
                        <span>{l.createdAt.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span>
                      </p>
                    </Link>
                  </li>
                ))}
                {items.length === 0 && <li className="py-4 text-sm text-muted">—</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
