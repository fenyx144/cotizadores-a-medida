/**
 * Calendario mensual de visitas.
 * - Visitas confirmadas (visitAt): en tinta, con hora.
 * - Solicitadas sin confirmar (fecha preferida): en gris y cursiva.
 */
import Link from "next/link";
import { and, gte, lte, or } from "drizzle-orm";
import { monthGrid, MONTH_NAMES } from "@portafolio/core/calendar";
import { toDateKey } from "@portafolio/core/validation";
import { getDb, schema } from "@/lib/db";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes } = await searchParams;
  const now = new Date();
  const [year, month] = mes && /^\d{4}-\d{2}$/.test(mes) ? mes.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];
  const weeks = monthGrid(year, month);
  const first = weeks[0][0].key, last = weeks[weeks.length - 1][6].key;

  const L = schema.leads;
  const leads = await getDb()
    .select()
    .from(L)
    .where(or(and(gte(L.preferredDate, first), lte(L.preferredDate, last)), and(gte(L.visitAt, new Date(first)), lte(L.visitAt, new Date(last + "T23:59")))));

  // Agrupamos por día: confirmadas por visitAt; pendientes por fecha preferida.
  const byDay = new Map<string, { id: number; label: string; confirmed: boolean }[]>();
  for (const l of leads) {
    const confirmed = !!l.visitAt;
    if (!confirmed && !["nuevo", "en_revision"].includes(l.status)) continue;
    const key = confirmed ? toDateKey(l.visitAt!) : l.preferredDate;
    const time = confirmed ? l.visitAt!.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : l.preferredSlot === "manana" ? "mañana" : "tarde";
    const list = byDay.get(key) ?? [];
    list.push({ id: l.id, label: `${time} · ${l.name}`, confirmed });
    byDay.set(key, list);
  }

  const shift = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const todayKey = toDateKey(now);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <h1 className="font-serif text-3xl first-letter:uppercase">
          {MONTH_NAMES[month - 1]} <span className="text-muted">{year}</span>
        </h1>
        <div className="flex items-center gap-6 text-sm">
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-ink" /> Confirmada</span>
          <span className="flex items-center gap-2 text-muted"><span className="h-2 w-2 rounded-full border border-muted" /> Solicitada</span>
          <Link href={`/admin/calendario?mes=${shift(-1)}`} className="underline underline-offset-4">Anterior</Link>
          <Link href={`/admin/calendario?mes=${shift(1)}`} className="underline underline-offset-4">Siguiente</Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-7 text-xs text-muted">
        {["lun", "mar", "mié", "jue", "vie", "sáb", "dom"].map((d) => <div key={d} className="pb-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 border-l border-t border-line">
        {weeks.flat().map((day) => (
          <div key={day.key} className={`min-h-28 border-b border-r border-line p-2 ${day.inMonth ? "" : "bg-paper-deep/40 text-muted"}`}>
            <p className={`text-sm ${day.key === todayKey ? "inline-block rounded-full bg-terracotta px-1.5 text-paper" : ""}`}>{day.day}</p>
            <ul className="mt-1 space-y-1">
              {(byDay.get(day.key) ?? []).map((v) => (
                <li key={v.id}>
                  <Link href={`/admin/leads/${v.id}`} className={`block truncate text-xs hover:underline ${v.confirmed ? "text-ink" : "italic text-muted"}`}>
                    {v.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
