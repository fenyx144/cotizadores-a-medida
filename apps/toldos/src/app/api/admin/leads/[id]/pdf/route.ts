/** Exporta un lead a PDF (ficha para llevar a la visita). */
import { eq } from "drizzle-orm";
import { buildPdf } from "@portafolio/core/pdf";
import { DRIVE_LABELS, formatEuro, formatMeters } from "@portafolio/core/pricing";
import { LEAD_STATUS_LABELS, SLOT_LABELS, type LeadStatus } from "@portafolio/core/leads";
import { getDb, schema } from "@/lib/db";
import { getSession } from "@/lib/session";
import { TYPE_LABELS } from "@/lib/content";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return new Response("No autorizado", { status: 401 });
  const id = Number((await ctx.params).id);
  const db = getDb();
  const [lead] = await db.select().from(schema.leads).where(eq(schema.leads.id, id));
  if (!lead) return new Response("No encontrado", { status: 404 });
  const notes = await db.select().from(schema.leadNotes).where(eq(schema.leadNotes.leadId, id));
  const c = lead.configuration;
  const fmtDate = (d: Date) => d.toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Amsterdam" });

  const pdf = await buildPdf({
    brand: "SunShade · Toldos y pérgolas a medida",
    title: `Solicitud ${lead.reference}`,
    subtitle: `Recibida el ${fmtDate(lead.createdAt)} · Estado: ${LEAD_STATUS_LABELS[lead.status as LeadStatus]}`,
    sections: [
      { heading: "Cliente", rows: [["Nombre", lead.name], ["Teléfono", lead.phone], ["Correo", lead.email], ["Dirección", `${lead.address}, ${lead.postalCode} ${lead.city}`], ["Zona", lead.zoneName ?? "-"]] },
      {
        heading: "Visita",
        rows: [
          ["Fecha preferida", `${lead.preferredDate} · ${SLOT_LABELS[lead.preferredSlot] ?? lead.preferredSlot}`],
          ["Visita confirmada", lead.visitAt ? fmtDate(lead.visitAt) : "Pendiente"],
        ],
      },
      c
        ? {
            heading: "Diseño",
            rows: [
              ["Modelo", `${c.modelName} (${TYPE_LABELS[c.modelType] ?? c.modelType})`],
              ["Medidas", `${formatMeters(c.width)} × ${formatMeters(c.projection)}`],
              ["Lona", c.fabricName],
              ["Estructura", c.frameColorName],
              ["Accionamiento", DRIVE_LABELS[c.drive]],
              ["Precio orientativo", lead.estimatedPrice ? `desde ${formatEuro(lead.estimatedPrice)}` : "-"],
            ],
          }
        : { heading: "Diseño", rows: [["", "Sin diseño previo"]] },
      { heading: "Mensaje del cliente", rows: [["", lead.message || "-"]] },
      { heading: "Notas internas", rows: notes.length ? notes.map((n) => [n.createdAt.toLocaleDateString("es-ES"), `${n.body} (${n.author})`] as [string, string]) : [["", "-"]] },
    ],
    footer: "Documento interno · Precio orientativo sujeto a medición",
  });

  return new Response(Buffer.from(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${lead.reference}.pdf"` },
  });
}
