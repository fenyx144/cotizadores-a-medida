/**
 * POST /api/leads — crea una solicitud de visita.
 * Pasos: validar datos -> comprobar zona -> recalcular precio en el servidor
 * (nunca fiarse del precio que manda el navegador) -> guardar fotos -> guardar
 * lead -> avisar por email.
 */
import { eq } from "drizzle-orm";
import { calculatePrice, DRIVE_LABELS, formatMoney, validateDimensions } from "@portafolio/core/pricing";
import { fieldErrors, findZone, quoteRequestSchema } from "@portafolio/core/validation";
import { getStorage, isStorageAvailable, makeKey, MAX_UPLOAD_FILES, StorageUnavailableError, validateUpload } from "@portafolio/core/storage";
import { sendEmail } from "@portafolio/core/email";
import { leadReference } from "@portafolio/core/leads";
import type { LeadConfiguration } from "@portafolio/core/db/schema";
import { getDb, schema } from "@/lib/db";
import { getCatalog, getZones } from "@/lib/catalog";

export async function POST(req: Request) {
  const form = await req.formData();
  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get("data") ?? "{}"));
  } catch {
    return Response.json({ error: "Datos no válidos" }, { status: 400 });
  }

  const parsed = quoteRequestSchema.safeParse(raw);
  if (!parsed.success) return Response.json({ error: "Revisa los campos", fields: fieldErrors(parsed.error) }, { status: 422 });
  const data = parsed.data;

  // Zona de servicio
  const zone = findZone(data.district, await getZones());
  if (!zone) return Response.json({ error: "Fuera de zona", fields: { district: "Todavía no llegamos a tu distrito." } }, { status: 422 });

  // Configuración: validar contra el catálogo y recalcular el precio
  let configuration: LeadConfiguration | null = null;
  let estimatedPrice: number | null = null;
  if (data.configuration) {
    const catalog = await getCatalog();
    const c = data.configuration;
    const model = catalog.models.find((m) => m.id === c.modelId);
    const fabric = catalog.fabrics.find((f) => f.id === c.fabricId);
    const frame = catalog.frameColors.find((f) => f.id === c.frameColorId);
    if (!model || !fabric || !frame) return Response.json({ error: "El diseño ya no está disponible. Vuelve a configurarlo." }, { status: 422 });
    const dimErrors = validateDimensions(model, c.width, c.projection);
    if (dimErrors.length) return Response.json({ error: dimErrors[0] }, { status: 422 });
    estimatedPrice = calculatePrice(c, { model, fabric, frameColor: frame, rules: catalog.rules }).total;
    configuration = {
      ...c,
      modelName: model.name, modelType: model.type,
      fabricName: fabric.name, fabricHex: fabric.hex, fabricPattern: fabric.pattern, fabricStripeHex: fabric.stripeHex,
      frameColorName: frame.name, frameHex: frame.hex,
    };
  }

  // Fotos
  const photos = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (photos.length > MAX_UPLOAD_FILES) return Response.json({ error: `Máximo ${MAX_UPLOAD_FILES} fotos.` }, { status: 422 });
  // Sin almacenamiento (p. ej. Vercel sin R2): avisamos antes de crear el lead.
  if (photos.length && !isStorageAvailable()) return Response.json({ error: new StorageUnavailableError().message, fields: { photos: "Quita las fotos para enviar la solicitud." } }, { status: 503 });
  for (const p of photos) {
    const err = validateUpload(p);
    if (err) return Response.json({ error: err }, { status: 422 });
  }

  const db = getDb();
  const [lead] = await db
    .insert(schema.leads)
    .values({
      name: data.name, email: data.email, phone: data.phone,
      district: zone.name, address: data.address,
      zoneName: zone.name, preferredDate: data.preferredDate, preferredSlot: data.preferredSlot,
      message: data.message, configuration, estimatedPrice,
    })
    .returning();
  const reference = leadReference("SS", lead.id);
  await db.update(schema.leads).set({ reference }).where(eq(schema.leads.id, lead.id));

  const storage = getStorage();
  for (const p of photos) {
    const key = makeKey(`leads/${lead.id}`, p.name);
    await storage.put(key, new Uint8Array(await p.arrayBuffer()), p.type);
    await db.insert(schema.leadPhotos).values({ leadId: lead.id, key, fileName: p.name, contentType: p.type, size: p.size });
  }

  // Emails (si no hay clave de Resend, se muestran en consola)
  const summary = configuration
    ? `${configuration.modelName}, ${configuration.width}×${configuration.projection} cm, lona ${configuration.fabricName}, ${DRIVE_LABELS[configuration.drive]}. Desde ${formatMoney(estimatedPrice ?? 0)}.`
    : "Sin diseño previo.";
  await Promise.all([
    sendEmail({
      to: data.email,
      subject: `Hemos recibido tu solicitud (${reference})`,
      html: `<p>Hola ${data.name},</p><p>Gracias por contactar con SunShade. Te llamaremos para confirmar la visita del ${data.preferredDate}.</p><p>${summary}</p>`,
    }),
    sendEmail({
      to: process.env.NOTIFY_EMAIL || "ventas@sunshade.example",
      subject: `Nuevo lead ${reference} · ${zone.name}`,
      html: `<p>${data.name} (${data.phone}) · ${data.address}, ${zone.name}</p><p>${summary}</p>`,
    }),
  ]);

  return Response.json({ reference }, { status: 201 });
}
