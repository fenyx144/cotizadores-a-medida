"use server";
/**
 * Flujo rápido para particulares (sin cuenta): datos de contacto + ventanas
 * (o solicitud de medición). Crea un proyecto "particular" ya enviado.
 */
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { validateDimensions } from "@portafolio/core/pricing";
import { PHONE_REGEX } from "@portafolio/core/validation";
import { projectReference } from "@portafolio/core/projects";
import { sendEmail } from "@portafolio/core/email";
import { getDb, schema } from "@/lib/db";
import { getCatalog, priceLine } from "@/lib/catalog";

const schemaIn = z.object({
  name: z.string().trim().min(3, "Escriba su nombre"),
  email: z.string().trim().toLowerCase().email("Correo no válido"),
  phone: z.string().trim().regex(PHONE_REGEX, "Teléfono no válido"),
  district: z.string().trim().min(2, "Indique el distrito"),
  address: z.string().trim().min(5, "Indique la dirección"),
  mode: z.enum(["medidas", "medicion"]),
  approxWindows: z.number().int().min(1).max(200).optional(),
  rows: z
    .array(z.object({ room: z.string().trim().min(1, "Indique el ambiente"), modelId: z.number().int(), width: z.number().int(), height: z.number().int(), quantity: z.number().int().min(1).max(50) }))
    .max(40),
});

export type QuickInput = z.input<typeof schemaIn>;

export async function submitQuickQuote(input: QuickInput): Promise<{ error?: string; fields?: Record<string, string> }> {
  const parsed = schemaIn.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0])] ??= i.message;
    return { fields, error: "Revise los campos marcados." };
  }
  const d = parsed.data;
  if (d.mode === "medidas" && !d.rows.length) return { error: "Agregue al menos una ventana." };
  if (d.mode === "medicion" && !d.approxWindows) return { fields: { approxWindows: "¿Cuántas ventanas, aproximadamente?" } };

  const catalog = await getCatalog();
  // Validamos medidas contra cada producto antes de guardar nada.
  for (const [i, r] of d.rows.entries()) {
    const model = catalog.models.find((m) => m.id === r.modelId);
    if (!model) return { error: `Ventana ${i + 1}: producto no disponible.` };
    const errs = validateDimensions(model, r.width, r.height);
    if (errs.length && d.mode === "medidas") return { error: `Ventana ${i + 1} (${r.room}): ${errs[0]}` };
  }

  const db = getDb();
  let [client] = await db.select().from(schema.clients).where(eq(schema.clients.email, d.email));
  if (!client) [client] = await db.insert(schema.clients).values({ email: d.email, name: d.name, phone: d.phone, kind: "particular" }).returning();

  const [project] = await db
    .insert(schema.projects)
    .values({
      clientId: client.id, kind: "particular", sector: "vivienda", status: "enviado", sentAt: new Date(), name: `Vivienda en ${d.district}`, district: d.district, address: d.address,
      measurementRequest: d.mode === "medicion" ? { approxWindows: d.approxWindows!, address: d.address, district: d.district, contactPhone: d.phone } : null,
    })
    .returning();
  const reference = projectReference(project.id);
  await db.update(schema.projects).set({ reference }).where(eq(schema.projects.id, project.id));

  if (d.mode === "medidas") {
    for (const [i, r] of d.rows.entries()) {
      const [loc] = await db.insert(schema.locations).values({ projectId: project.id, building: "", floor: "", room: r.room, sortOrder: i }).returning();
      const priced = priceLine(catalog, { modelId: r.modelId, fabricId: 0, frameColorId: 0, drive: "manual", width: r.width, height: r.height })!;
      await db.insert(schema.lines).values({ projectId: project.id, locationId: loc.id, label: `V${i + 1}`, width: r.width, height: r.height, quantity: r.quantity, sortOrder: i, status: "configurada", ...priced });
    }
  }
  await sendEmail({ to: process.env.NOTIFY_EMAIL || "hola@ejemplo.pe", subject: `Cotización rápida ${reference}`, html: `<p>${d.name} (${d.phone}) · ${d.district}</p>` });
  redirect(`/particulares/gracias?ref=${reference}`);
}
