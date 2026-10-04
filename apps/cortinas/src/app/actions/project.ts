"use server";
/**
 * Acciones del editor "Mi proyecto". Todas:
 * 1) verifican que el proyecto sea del cliente con sesión y siga en borrador,
 * 2) hacen el cambio,
 * 3) devuelven el proyecto completo actualizado (así el editor solo reemplaza su estado).
 */
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { validateDimensions } from "@portafolio/core/pricing";
import { nextLabel } from "@portafolio/core/projects";
import { parseMeasurementFile, type ImportResult, type MeasurementRow } from "@portafolio/core/import";
import { getStorage, makeKey } from "@portafolio/core/storage";
import { sendEmail } from "@portafolio/core/email";
import type { LineConfig } from "@portafolio/core/db/project-schema";
import { getDb, schema } from "@/lib/db";
import { getClientSession } from "@/lib/client-session";
import { getCatalog, priceLine } from "@/lib/catalog";
import { loadProject, type ProjectData } from "@/lib/project";

export type ActionResult = { ok: true; data: ProjectData; createdId?: number } | { ok: false; error: string };

class ActionError extends Error {}

/** Comprueba sesión, propiedad y estado. Lanza ActionError con un mensaje legible. */
async function editableProject(projectId: number) {
  const session = await getClientSession();
  if (!session) throw new ActionError("Su sesión expiró. Vuelva a ingresar.");
  const [project] = await getDb().select().from(schema.projects).where(eq(schema.projects.id, projectId));
  if (!project || project.clientId !== session.userId) throw new ActionError("Proyecto no encontrado.");
  if (project.status !== "borrador") throw new ActionError("El proyecto ya fue enviado y no se puede editar.");
  return { project, session };
}

/** Envuelve cada acción: errores esperados -> mensaje; además marca el proyecto como actualizado. */
async function run(projectId: number, fn: () => Promise<number | void>): Promise<ActionResult> {
  try {
    await editableProject(projectId);
    const createdId = await fn();
    await getDb().update(schema.projects).set({ updatedAt: new Date() }).where(eq(schema.projects.id, projectId));
    const data = (await loadProject(projectId))!;
    return { ok: true, data, createdId: createdId ?? undefined };
  } catch (e) {
    if (e instanceof ActionError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "No se pudo guardar. Inténtelo de nuevo." };
  }
}

const locationSchema = z.object({
  building: z.string().trim().max(80),
  floor: z.string().trim().max(80),
  room: z.string().trim().min(1, "Indique el ambiente").max(80),
});

export async function addLocation(projectId: number, input: z.infer<typeof locationSchema>) {
  return run(projectId, async () => {
    const parsed = locationSchema.safeParse(input);
    if (!parsed.success) throw new ActionError(parsed.error.issues[0].message);
    const [row] = await getDb().insert(schema.locations).values({ projectId, ...parsed.data, sortOrder: Date.now() % 1e9 }).returning();
    return row.id;
  });
}

export async function updateLocation(projectId: number, id: number, input: z.infer<typeof locationSchema>) {
  return run(projectId, async () => {
    const parsed = locationSchema.safeParse(input);
    if (!parsed.success) throw new ActionError(parsed.error.issues[0].message);
    await getDb().update(schema.locations).set(parsed.data).where(and(eq(schema.locations.id, id), eq(schema.locations.projectId, projectId)));
  });
}

export async function deleteLocation(projectId: number, id: number) {
  return run(projectId, async () => {
    const db = getDb();
    // Las líneas sin plano se borran con la ubicación; las del plano se conservan sin ubicación.
    await db.delete(schema.lines).where(and(eq(schema.lines.projectId, projectId), eq(schema.lines.locationId, id), isNull(schema.lines.planId)));
    await db.delete(schema.locations).where(and(eq(schema.locations.id, id), eq(schema.locations.projectId, projectId)));
  });
}

/** Duplica una ubicación con sus líneas (sin anotaciones de plano). Útil para aulas tipo. */
export async function duplicateLocation(projectId: number, id: number, times = 1) {
  return run(projectId, async () => {
    const db = getDb();
    const [loc] = await db.select().from(schema.locations).where(and(eq(schema.locations.id, id), eq(schema.locations.projectId, projectId)));
    if (!loc) throw new ActionError("Ubicación no encontrada.");
    const n = Math.min(30, Math.max(1, Math.round(times)));
    const srcLines = await db.select().from(schema.lines).where(eq(schema.lines.locationId, id));
    const all = await db.select({ label: schema.lines.label }).from(schema.lines).where(eq(schema.lines.projectId, projectId));
    const labels = all.map((l) => l.label);
    // Si el ambiente termina en número ("Aula 101"), las copias siguen la serie (102, 103...).
    const m = /^(.*?)(\d+)$/.exec(loc.room);
    let lastId = 0;
    for (let i = 1; i <= n; i++) {
      const room = m ? `${m[1]}${Number(m[2]) + i}` : `${loc.room} (copia ${i})`;
      const [copy] = await db.insert(schema.locations).values({ projectId, building: loc.building, floor: loc.floor, room, sortOrder: loc.sortOrder }).returning();
      lastId = copy.id;
      for (const l of srcLines) {
        const label = nextLabel(labels);
        labels.push(label);
        await db.insert(schema.lines).values({
          projectId, locationId: copy.id, label, width: l.width, height: l.height, config: l.config, quantity: l.quantity, note: l.note,
          unitPrice: l.unitPrice, status: l.config ? "configurada" : "sin_configurar", sortOrder: l.sortOrder,
        });
      }
    }
    return lastId;
  });
}

const lineSchema = z.object({
  id: z.number().int().optional(),
  locationId: z.number().int().nullable(),
  width: z.number().int().min(20).max(800).nullable(),
  height: z.number().int().min(20).max(800).nullable(),
  quantity: z.number().int().min(1, "Cantidad mínima 1").max(500),
  note: z.string().max(400).default(""),
  modelId: z.number().int().nullable(),
  fabricId: z.number().int().nullable(),
  frameColorId: z.number().int().nullable(),
  drive: z.enum(["manual", "motor", "sensor"]).default("manual"),
});
export type LineFormInput = z.input<typeof lineSchema>;

/** Calcula config + precio si hay producto y medidas válidas. */
async function resolveConfig(input: z.infer<typeof lineSchema>, label: string) {
  if (!input.modelId) return { config: null, unitPrice: null, status: "sin_configurar" as const };
  const catalog = await getCatalog();
  const model = catalog.models.find((m) => m.id === input.modelId);
  if (!model) throw new ActionError("Producto no disponible.");
  if (!input.width || !input.height) throw new ActionError(`${label}: indique ancho y alto.`);
  const errors = validateDimensions(model, input.width, input.height);
  if (errors.length) throw new ActionError(`${label}: ${errors[0]}`);
  const priced = priceLine(catalog, { modelId: model.id, fabricId: input.fabricId ?? 0, frameColorId: input.frameColorId ?? 0, drive: input.drive, width: input.width, height: input.height })!;
  return { ...priced, status: "configurada" as const };
}

export async function saveLine(projectId: number, raw: LineFormInput) {
  return run(projectId, async () => {
    const parsed = lineSchema.safeParse(raw);
    if (!parsed.success) throw new ActionError(parsed.error.issues[0].message);
    const input = parsed.data;
    const db = getDb();
    const base = { locationId: input.locationId, width: input.width, height: input.height, quantity: input.quantity, note: input.note };
    if (input.id) {
      const [line] = await db.select().from(schema.lines).where(and(eq(schema.lines.id, input.id), eq(schema.lines.projectId, projectId)));
      if (!line) throw new ActionError("Línea no encontrada.");
      const cfg = await resolveConfig(input, line.label);
      await db.update(schema.lines).set({ ...base, ...cfg }).where(eq(schema.lines.id, line.id));
      return line.id;
    }
    const all = await db.select({ label: schema.lines.label }).from(schema.lines).where(eq(schema.lines.projectId, projectId));
    const label = nextLabel(all.map((l) => l.label));
    const cfg = await resolveConfig(input, label);
    const [row] = await db.insert(schema.lines).values({ projectId, label, ...base, ...cfg, sortOrder: all.length }).returning();
    return row.id;
  });
}

export async function deleteLines(projectId: number, ids: number[]) {
  return run(projectId, async () => {
    if (ids.length) await getDb().delete(schema.lines).where(and(eq(schema.lines.projectId, projectId), inArray(schema.lines.id, ids)));
  });
}

/**
 * Multiselección: aplica el mismo producto/tela/accionamiento a varias líneas.
 * Ancho y alto son opcionales: si no vienen, cada línea conserva los suyos.
 */
export async function applyConfig(
  projectId: number,
  ids: number[],
  input: { modelId: number; fabricId: number; frameColorId: number; drive: "manual" | "motor" | "sensor"; width?: number | null; height?: number | null; locationId?: number | null },
) {
  return run(projectId, async () => {
    const db = getDb();
    const lines = await db.select().from(schema.lines).where(and(eq(schema.lines.projectId, projectId), inArray(schema.lines.id, ids)));
    const problems: string[] = [];
    for (const line of lines) {
      const values = {
        id: line.id, locationId: input.locationId !== undefined ? input.locationId : line.locationId,
        width: input.width || line.width, height: input.height || line.height, quantity: line.quantity, note: line.note,
        modelId: input.modelId, fabricId: input.fabricId, frameColorId: input.frameColorId, drive: input.drive,
      };
      try {
        const cfg = await resolveConfig(values, line.label);
        await db.update(schema.lines).set({ locationId: values.locationId, width: values.width, height: values.height, ...cfg }).where(eq(schema.lines.id, line.id));
      } catch (e) {
        if (e instanceof ActionError) problems.push(e.message);
        else throw e;
      }
    }
    if (problems.length) throw new ActionError(`Se aplicó a ${lines.length - problems.length} de ${lines.length}. ${problems.slice(0, 3).join(" ")}`);
  });
}

/** Nueva anotación (punto o rectángulo) sobre un plano o foto: crea una línea sin configurar. */
export async function createAnnotation(
  projectId: number,
  planId: number,
  a: { shape: "point" | "rect"; x: number; y: number; w?: number; h?: number; locationId: number | null; width?: number | null; height?: number | null },
) {
  return run(projectId, async () => {
    const db = getDb();
    const [plan] = await db.select().from(schema.plans).where(and(eq(schema.plans.id, planId), eq(schema.plans.projectId, projectId)));
    if (!plan) throw new ActionError("Plano no encontrado.");
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    const all = await db.select({ label: schema.lines.label }).from(schema.lines).where(eq(schema.lines.projectId, projectId));
    const [row] = await db
      .insert(schema.lines)
      .values({
        projectId, planId, locationId: plan.locationId ?? a.locationId, label: nextLabel(all.map((l) => l.label)), shape: a.shape,
        x: clamp(a.x), y: clamp(a.y), w: a.shape === "rect" ? clamp(a.w ?? 0) : null, h: a.shape === "rect" ? clamp(a.h ?? 0) : null,
        width: a.width ?? null, height: a.height ?? null, quantity: 1, sortOrder: all.length,
      })
      .returning();
    return row.id;
  });
}

const MAX_PLAN_BYTES = 15 * 1024 * 1024;

/** Sube un plano (o foto de una ubicación). Los PDF ya llegan convertidos a PNG desde el navegador. */
export async function uploadPlan(projectId: number, formData: FormData) {
  return run(projectId, async () => {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new ActionError("Elija un archivo.");
    if (!["image/png", "image/jpeg"].includes(file.type)) throw new ActionError("El plano debe ser PNG, JPG o PDF.");
    if (file.size > MAX_PLAN_BYTES) throw new ActionError("El archivo supera 15 MB.");
    const width = Number(formData.get("width"));
    const height = Number(formData.get("height"));
    if (!(width > 0 && height > 0)) throw new ActionError("No se pudo leer el tamaño de la imagen.");
    const kind = formData.get("kind") === "foto" ? "foto" : "plano";
    const locationId = Number(formData.get("locationId")) || null;
    if (kind === "foto" && !locationId) throw new ActionError("Elija la ubicación de la foto.");
    const key = makeKey(`planos/p${projectId}`, file.name.replace(/\.pdf$/i, ".png"));
    await getStorage().put(key, new Uint8Array(await file.arrayBuffer()), file.type);
    const [row] = await getDb()
      .insert(schema.plans)
      .values({ projectId, kind, locationId, name: String(formData.get("name") || file.name).slice(0, 120), imageKey: key, width, height })
      .returning();
    return row.id;
  });
}

export async function deletePlan(projectId: number, planId: number) {
  return run(projectId, async () => {
    const db = getDb();
    const [plan] = await db.select().from(schema.plans).where(and(eq(schema.plans.id, planId), eq(schema.plans.projectId, projectId)));
    if (!plan) return;
    // Las líneas se conservan, pero pierden su anotación.
    await db.update(schema.lines).set({ planId: null, shape: null, x: null, y: null, w: null, h: null }).where(eq(schema.lines.planId, planId));
    await db.delete(schema.plans).where(eq(schema.plans.id, planId));
    await getStorage().delete(plan.imageKey).catch(() => {});
  });
}

export async function calibratePlan(projectId: number, planId: number, metersPerPx: number | null) {
  return run(projectId, async () => {
    if (metersPerPx != null && !(metersPerPx > 0 && metersPerPx < 10)) throw new ActionError("Escala no válida.");
    await getDb().update(schema.plans).set({ metersPerPx }).where(and(eq(schema.plans.id, planId), eq(schema.plans.projectId, projectId)));
  });
}

/** Paso 1 de la importación: leer y validar el archivo sin guardar nada. */
export async function previewImport(projectId: number, formData: FormData): Promise<ImportResult | { error: string }> {
  try {
    await editableProject(projectId);
  } catch (e) {
    return { error: e instanceof ActionError ? e.message : "Error" };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Elija un archivo CSV o Excel." };
  if (file.size > 2 * 1024 * 1024) return { error: "El archivo supera 2 MB." };
  return parseMeasurementFile(new Uint8Array(await file.arrayBuffer()), file.name);
}

/** Paso 2: crear ubicaciones (si no existen) y líneas a partir de las filas válidas. */
export async function commitImport(projectId: number, rows: MeasurementRow[]) {
  return run(projectId, async () => {
    if (!rows.length || rows.length > 1000) throw new ActionError("No hay filas para importar.");
    const db = getDb();
    const catalog = await getCatalog();
    const locations = await db.select().from(schema.locations).where(eq(schema.locations.projectId, projectId));
    const all = await db.select({ label: schema.lines.label }).from(schema.lines).where(eq(schema.lines.projectId, projectId));
    const labels = all.map((l) => l.label);
    const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    for (const r of rows) {
      const building = r.building.slice(0, 80);
      const floor = r.floor.slice(0, 80);
      const room = r.room.slice(0, 80);
      let loc = locations.find((l) => norm(l.building) === norm(building) && norm(l.floor) === norm(floor) && norm(l.room) === norm(room));
      if (!loc) {
        [loc] = await db.insert(schema.locations).values({ projectId, building, floor, room, sortOrder: locations.length }).returning();
        locations.push(loc);
      }
      // Producto opcional: por nombre o slug. Si no coincide, la línea queda sin configurar.
      const model = r.product ? catalog.models.find((m) => norm(m.name) === norm(r.product) || m.slug === norm(r.product)) : undefined;
      let cfg: { config: LineConfig | null; unitPrice: number | null; status: "configurada" | "sin_configurar" } = { config: null, unitPrice: null, status: "sin_configurar" };
      if (model && validateDimensions(model, r.width, r.height).length === 0) {
        const priced = priceLine(catalog, { modelId: model.id, fabricId: 0, frameColorId: 0, drive: "manual", width: r.width, height: r.height })!;
        cfg = { ...priced, status: "configurada" };
      }
      const label = r.code && !labels.includes(r.code) ? r.code.slice(0, 12) : nextLabel(labels);
      labels.push(label);
      const note = [r.note, model || !r.product ? "" : `Producto indicado: ${r.product}`].filter(Boolean).join(" · ");
      await db.insert(schema.lines).values({ projectId, locationId: loc.id, label, width: r.width, height: r.height, quantity: r.quantity, note, sortOrder: labels.length, ...cfg });
    }
  });
}

const measurementSchema = z.object({
  approxWindows: z.number().int().min(1, "Indique cuántas ventanas aproximadamente").max(2000),
  address: z.string().trim().min(5, "Indique la dirección"),
  district: z.string().trim().min(2, "Indique el distrito"),
  preferredDate: z.string().optional(),
  contactPhone: z.string().optional(),
});

export async function requestMeasurement(projectId: number, input: z.input<typeof measurementSchema>) {
  return run(projectId, async () => {
    const parsed = measurementSchema.safeParse(input);
    if (!parsed.success) throw new ActionError(parsed.error.issues[0].message);
    await getDb().update(schema.projects).set({ measurementRequest: parsed.data }).where(eq(schema.projects.id, projectId));
  });
}

export async function updateNotes(projectId: number, notes: string) {
  return run(projectId, async () => {
    await getDb().update(schema.projects).set({ notes: notes.slice(0, 2000) }).where(eq(schema.projects.id, projectId));
  });
}

/** Enviar a Cota: pasa a "enviado", queda en solo lectura y avisamos al equipo. */
export async function sendProject(projectId: number) {
  return run(projectId, async () => {
    const data = (await loadProject(projectId))!;
    if (!data.lines.length && !data.project.measurementRequest) throw new ActionError("Agregue al menos una ventana o solicite la medición en obra.");
    await getDb().update(schema.projects).set({ status: "enviado", sentAt: new Date() }).where(eq(schema.projects.id, projectId));
    const windows = data.lines.reduce((s, l) => s + l.quantity, 0);
    await sendEmail({
      to: process.env.NOTIFY_EMAIL || "hola@ejemplo.pe",
      subject: `Nuevo proyecto ${data.project.reference}: ${data.project.name}`,
      html: `<p>${data.client.company || data.client.name} envió <b>${data.project.name}</b> con ${windows} cortinas.</p>`,
    });
  });
}

/** "Agregar al proyecto" desde la ficha de producto: crea la línea en la ubicación "Por ubicar". */
export async function addFromCatalog(
  projectId: number,
  input: { modelId: number; fabricId: number; drive: "manual" | "motor" | "sensor"; width: number; height: number; quantity: number },
) {
  return run(projectId, async () => {
    const db = getDb();
    let [loc] = await db.select().from(schema.locations).where(and(eq(schema.locations.projectId, projectId), eq(schema.locations.room, "Por ubicar")));
    if (!loc) [loc] = await db.insert(schema.locations).values({ projectId, building: "", floor: "", room: "Por ubicar", sortOrder: 9999 }).returning();
    const all = await db.select({ label: schema.lines.label }).from(schema.lines).where(eq(schema.lines.projectId, projectId));
    const label = nextLabel(all.map((l) => l.label));
    const cfg = await resolveConfig({ ...input, locationId: loc.id, note: "", frameColorId: null }, label);
    const [row] = await db
      .insert(schema.lines)
      .values({ projectId, locationId: loc.id, label, width: input.width, height: input.height, quantity: Math.max(1, Math.min(500, input.quantity)), sortOrder: all.length, ...cfg })
      .returning();
    return row.id;
  });
}
