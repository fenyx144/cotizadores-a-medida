/** Lectura del catálogo y cálculo del precio de una línea (servidor). */
import "server-only";
import { asc, eq } from "drizzle-orm";
import type { PricingRule } from "@portafolio/core/pricing";
import { getDb, schema } from "./db";

export async function getCatalog() {
  const db = getDb();
  const [models, fabrics, frames, rules, families, constraints, materials, variants] = await Promise.all([
    db.select().from(schema.productModels).where(eq(schema.productModels.active, true)).orderBy(asc(schema.productModels.sortOrder)),
    db.select().from(schema.fabrics).where(eq(schema.fabrics.active, true)).orderBy(asc(schema.fabrics.sortOrder)),
    db.select().from(schema.frameColors).where(eq(schema.frameColors.active, true)).orderBy(asc(schema.frameColors.sortOrder)),
    db.select().from(schema.priceRules).where(eq(schema.priceRules.active, true)),
    db.select().from(schema.productFamilies).orderBy(asc(schema.productFamilies.sortOrder), asc(schema.productFamilies.id)),
    db.select().from(schema.constraintRules).where(eq(schema.constraintRules.active, true)),
    db.select().from(schema.materials).orderBy(asc(schema.materials.sortOrder), asc(schema.materials.id)),
    db.select().from(schema.productVariants).where(eq(schema.productVariants.active, true)),
  ]);
  return { models, fabrics, frames, rules: rules as PricingRule[], families, constraints, materials, variants };
}

export type Catalog = Awaited<ReturnType<typeof getCatalog>>;

export { fabricsFor, priceLine, type LineInput } from "./line-price";
