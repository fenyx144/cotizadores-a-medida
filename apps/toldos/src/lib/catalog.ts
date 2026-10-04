/**
 * Lectura del catálogo desde la base de datos (solo en el servidor).
 * Las páginas públicas llaman a getCatalog() y pasan los datos a los
 * componentes del cliente (configurador, muestrario...).
 */
import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import type { Drive, PricingRule } from "@portafolio/core/pricing";

export async function getCatalog() {
  const db = getDb();
  const [models, fabrics, frameColors, rules] = await Promise.all([
    db.select().from(schema.productModels).where(eq(schema.productModels.active, true)).orderBy(asc(schema.productModels.sortOrder)),
    db.select().from(schema.fabrics).where(eq(schema.fabrics.active, true)).orderBy(asc(schema.fabrics.sortOrder)),
    db.select().from(schema.frameColors).where(eq(schema.frameColors.active, true)).orderBy(asc(schema.frameColors.sortOrder)),
    db.select().from(schema.priceRules).where(eq(schema.priceRules.active, true)),
  ]);
  return { models, fabrics, frameColors, rules: rules.map(toPricingRule) };
}

export type Catalog = Awaited<ReturnType<typeof getCatalog>>;

/** Adapta la fila de la BD al tipo que usa el motor de precios. */
export function toPricingRule(r: typeof schema.priceRules.$inferSelect): PricingRule {
  return { ...r, kind: r.kind as PricingRule["kind"], drive: (r.drive as Drive | null) ?? null };
}

export async function getZones() {
  const db = getDb();
  return db.select().from(schema.serviceZones).orderBy(asc(schema.serviceZones.postalFrom));
}
