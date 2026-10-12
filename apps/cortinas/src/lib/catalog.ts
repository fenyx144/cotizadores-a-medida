/** Lectura del catálogo y cálculo del precio de una línea (servidor). */
import { ensureSchema, ensureMaterialScopes, ensureMaterialPrices, ensureDemoCleanup, ensureAccionamiento, ensureCombinedDemo, ensureOrderFromOne, ensureMaterialNames } from "./accionamiento";
import "server-only";
import { asc, eq } from "drizzle-orm";
import type { PricingRule } from "@portafolio/core/pricing";
import type { CatalogData } from "./line-price";
import { getDb, schema } from "./db";

export async function getCatalog() {
  await ensureSchema();
  await ensureAccionamiento();
  await ensureCombinedDemo();
  await ensureOrderFromOne();
  await ensureMaterialNames();
  await ensureMaterialScopes();
  await ensureMaterialPrices();
  await ensureDemoCleanup();
  const db = getDb();
  const [models, attributes, values, rules, families, constraints, materials, variants] = await Promise.all([
    db.select().from(schema.productModels).where(eq(schema.productModels.active, true)).orderBy(asc(schema.productModels.sortOrder)),
    db.select().from(schema.attributes).orderBy(asc(schema.attributes.sortOrder), asc(schema.attributes.id)),
    db.select().from(schema.attributeValues).orderBy(asc(schema.attributeValues.sortOrder), asc(schema.attributeValues.id)),
    db.select().from(schema.priceRules).where(eq(schema.priceRules.active, true)),
    db.select().from(schema.productFamilies).orderBy(asc(schema.productFamilies.sortOrder), asc(schema.productFamilies.id)),
    db.select().from(schema.constraintRules).where(eq(schema.constraintRules.active, true)),
    db.select().from(schema.materials).orderBy(asc(schema.materials.sortOrder), asc(schema.materials.id)),
    db.select().from(schema.productVariants).where(eq(schema.productVariants.active, true)),
  ]);
  return { models, attributes, values, rules: rules as PricingRule[], families, constraints, materials, variants } satisfies CatalogData;
}

export type Catalog = Awaited<ReturnType<typeof getCatalog>>;

export { priceLine, type LineInput } from "./line-price";
