/** Ficha de una solicitud: diseño, fotos, contacto, estado, visita y notas internas. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { DRIVE_LABELS, formatEuro, formatMeters } from "@portafolio/core/pricing";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, SLOT_LABELS } from "@portafolio/core/leads";
import { getDb, schema } from "@/lib/db";
import { TYPE_LABELS, projectionLabel } from "@/lib/content";
import { AwningPreview } from "@/components/AwningPreview";
import { addNote, scheduleVisit, updateLeadStatus } from "../../../actions";

/** Fecha -> valor para <input type="datetime-local"> en hora local del servidor. */
function toLocalInput(d: Date | null) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const db = getDb();
  const [lead] = await db.select().from(schema.leads).where(eq(schema.leads.id, id));
  if (!lead) notFound();
  const [photos, notes] = await Promise.all([
    db.select().from(schema.leadPhotos).where(eq(schema.leadPhotos.leadId, id)),
    db.select().from(schema.leadNotes).where(eq(schema.leadNotes.leadId, id)).orderBy(asc(schema.leadNotes.createdAt)),
  ]);
  const c = lead.configuration;

  return (
    <div>
      <Link href="/admin" className="text-sm text-muted hover:text-ink">← Solicitudes</Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-6 border-b border-line pb-6">
        <div>
          <p className="text-sm text-muted">{lead.reference} · recibida el {lead.createdAt.toLocaleDateString("es-ES", { day: "numeric", month: "long" })}</p>
          <h1 className="mt-1 font-serif text-4xl">{lead.name}</h1>
        </div>
        <div className="flex flex-wrap items-end gap-6 text-sm">
          <form action={updateLeadStatus} className="flex items-end gap-3">
            <input type="hidden" name="id" value={lead.id} />
            <label>
              <span className="block text-muted">Estado</span>
              <select name="status" defaultValue={lead.status} className="border-b border-line bg-transparent py-1.5">
                {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
              </select>
            </label>
            <button className="bg-ink px-4 py-2 text-paper">Guardar</button>
          </form>
          <a href={`/api/admin/leads/${lead.id}/pdf`} target="_blank" className="border border-ink px-4 py-2 hover:bg-ink hover:text-paper">Exportar PDF</a>
        </div>
      </div>

      <div className="mt-8 grid gap-12 xl:grid-cols-12">
        {/* Diseño y fotos */}
        <div className="space-y-10 xl:col-span-7">
          <section>
            <h2 className="mb-4 font-serif text-2xl">Diseño</h2>
            {c ? (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-paper-deep/60">
                  <AwningPreview type={c.modelType} width={c.width} projection={c.projection} fabric={{ hex: c.fabricHex, pattern: c.fabricPattern, stripeHex: c.fabricStripeHex }} frameHex={c.frameHex} drive={c.drive} className="block w-full" />
                </div>
                <dl className="divide-y divide-line border-y border-line self-start text-sm">
                  <Row k="Modelo" v={`${c.modelName} · ${TYPE_LABELS[c.modelType] ?? c.modelType}`} />
                  <Row k="Ancho" v={formatMeters(c.width)} />
                  <Row k={projectionLabel(c.modelType)} v={formatMeters(c.projection)} />
                  <Row k="Lona" v={c.fabricName} />
                  <Row k="Estructura" v={c.frameColorName} />
                  <Row k="Accionamiento" v={DRIVE_LABELS[c.drive]} />
                  <Row k="Orientativo" v={lead.estimatedPrice ? `desde ${formatEuro(lead.estimatedPrice)}` : "—"} />
                </dl>
              </div>
            ) : (
              <p className="text-muted">El cliente no configuró un diseño.</p>
            )}
          </section>

          <section>
            <h2 className="mb-4 font-serif text-2xl">Fotos del cliente</h2>
            {photos.length ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {photos.map((p) => (
                  <a key={p.id} href={`/api/files/${p.key}`} target="_blank" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/files/${p.key}`} alt={p.fileName} className="aspect-[4/3] w-full object-cover" />
                    <span className="mt-1 block truncate text-xs text-muted">{p.fileName}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-muted">Sin fotos.</p>
            )}
          </section>

          {lead.message && (
            <section>
              <h2 className="mb-3 font-serif text-2xl">Mensaje</h2>
              <p className="max-w-prose font-serif text-xl italic">“{lead.message}”</p>
            </section>
          )}
        </div>

        {/* Contacto, visita y notas */}
        <aside className="space-y-10 xl:col-span-4 xl:col-start-9">
          <section>
            <h2 className="mb-3 font-serif text-2xl">Contacto</h2>
            <dl className="divide-y divide-line border-y border-line text-sm">
              <Row k="Teléfono" v={<a href={`tel:${lead.phone}`} className="underline underline-offset-4">{lead.phone}</a>} />
              <Row k="Correo" v={<a href={`mailto:${lead.email}`} className="underline underline-offset-4">{lead.email}</a>} />
              <Row k="Dirección" v={`${lead.address}, ${lead.postalCode} ${lead.city}`} />
              <Row k="Zona" v={lead.zoneName ?? "—"} />
            </dl>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-2xl">Visita</h2>
            <p className="text-sm text-muted">Prefiere: {new Date(lead.preferredDate + "T12:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}, {SLOT_LABELS[lead.preferredSlot]?.toLowerCase()}</p>
            <form action={scheduleVisit} className="mt-4 flex items-end gap-3 text-sm">
              <input type="hidden" name="id" value={lead.id} />
              <label className="flex-1">
                <span className="block text-muted">Visita confirmada</span>
                <input type="datetime-local" name="visitAt" defaultValue={toLocalInput(lead.visitAt)} className="w-full border-b border-line bg-transparent py-1.5" />
              </label>
              <button className="bg-ink px-4 py-2 text-paper">Guardar</button>
            </form>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-2xl">Notas internas</h2>
            <ul className="border-t border-line">
              {notes.map((n) => (
                <li key={n.id} className="border-b border-line py-3 text-sm">
                  <p>{n.body}</p>
                  <p className="mt-1 text-xs text-muted">{n.author} · {n.createdAt.toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                </li>
              ))}
              {notes.length === 0 && <li className="border-b border-line py-3 text-sm text-muted">Sin notas todavía.</li>}
            </ul>
            <form action={addNote} className="mt-4 space-y-3">
              <input type="hidden" name="id" value={lead.id} />
              <textarea name="body" rows={3} required placeholder="Añadir nota…" className="w-full border border-line bg-transparent p-2 text-sm focus:border-ink focus:outline-none" />
              <button className="bg-ink px-4 py-2 text-sm text-paper">Añadir nota</button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
