/** Carga completa de un proyecto (cliente, ubicaciones, líneas, planos, comentarios). */
import "server-only";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { summarizeProject } from "@portafolio/core/projects";
import { getDb, schema } from "./db";

export async function loadProject(id: number) {
  const db = getDb();
  const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, id));
  if (!project) return null;
  const [[client], locations, lines, plans] = await Promise.all([
    db.select().from(schema.clients).where(eq(schema.clients.id, project.clientId)),
    db.select().from(schema.locations).where(eq(schema.locations.projectId, id)).orderBy(asc(schema.locations.sortOrder), asc(schema.locations.id)),
    db.select().from(schema.lines).where(eq(schema.lines.projectId, id)).orderBy(asc(schema.lines.sortOrder), asc(schema.lines.id)),
    db.select().from(schema.plans).where(eq(schema.plans.projectId, id)).orderBy(asc(schema.plans.id)),
  ]);
  const comments = lines.length
    ? await db.select().from(schema.lineComments).where(inArray(schema.lineComments.lineId, lines.map((l) => l.id))).orderBy(desc(schema.lineComments.createdAt))
    : [];
  const { passwordHash: _omit, ...safeClient } = client; // nunca enviar el hash al navegador
  void _omit;
  return { project, client: safeClient, locations, lines, plans, comments };
}

export type ProjectData = NonNullable<Awaited<ReturnType<typeof loadProject>>>;

/** Nombre legible de una ubicación: "Pabellón A · Piso 1 · Aula 101". */
export function locationName(l: { building: string; floor: string; room: string }) {
  return [l.building, l.floor, l.room].filter(Boolean).join(" · ");
}

export function projectSummary(data: Pick<ProjectData, "lines" | "locations">) {
  const byId = new Map(data.locations.map((l) => [l.id, l]));
  return summarizeProject(
    data.lines.map((l) => ({
      locationName: l.locationId && byId.get(l.locationId) ? locationName(byId.get(l.locationId)!) : "",
      productName: l.config?.modelName ?? null,
      quantity: l.quantity,
      unitPrice: l.config ? l.unitPrice : null,
    })),
  );
}
