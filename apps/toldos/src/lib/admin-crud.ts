/**
 * Recursos del CRUD del panel: tabla de Drizzle + validación Zod.
 * Las rutas /api/admin/[resource] usan este registro.
 */
import "server-only";
import { z } from "zod";
import { createCrudHandlers, type CrudResource } from "@portafolio/core/crud";
import { getDb, schema } from "./db";
import { getSession } from "./session";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color en formato #RRGGBB");
const cm = z.number().int().min(10, "Mínimo 10 cm").max(2000);
const money = z.number().min(0, "No puede ser negativo");

const modelSchema = z
  .object({
    name: z.string().min(2), slug: z.string().regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
    type: z.enum(["retractil", "cofre", "vertical", "pergola"]), tagline: z.string(), description: z.string(), image: z.string(),
    minWidth: cm, maxWidth: cm, minProjection: cm, maxProjection: cm, basePrice: money, pricePerM2: money,
    sortOrder: z.number().int(), active: z.boolean(),
  });

const resources: Record<string, CrudResource> = {
  models: { table: schema.productModels, schema: modelSchema, orderBy: schema.productModels.sortOrder },
  fabrics: {
    table: schema.fabrics,
    orderBy: schema.fabrics.sortOrder,
    schema: z.object({ name: z.string().min(2), code: z.string(), collection: z.string(), hex, pattern: z.enum(["liso", "rayas"]), stripeHex: hex.nullable(), surchargePerM2: money, sortOrder: z.number().int(), active: z.boolean() }),
  },
  frames: {
    table: schema.frameColors,
    orderBy: schema.frameColors.sortOrder,
    schema: z.object({ name: z.string().min(2), ral: z.string(), hex, surcharge: money, sortOrder: z.number().int(), active: z.boolean() }),
  },
  rules: {
    table: schema.priceRules,
    schema: z.object({
      name: z.string().min(2), kind: z.enum(["fijo", "por_m2", "porcentaje"]), amount: z.number(),
      drive: z.enum(["manual", "motor", "sensor"]).nullable(), modelType: z.string().nullable(), minArea: z.number().min(0).nullable(), active: z.boolean(),
    }),
  },
  zones: {
    table: schema.serviceZones,
    orderBy: schema.serviceZones.postalFrom,
    schema: z.object({ name: z.string().min(2), postalFrom: z.number().int().min(1000).max(9999), postalTo: z.number().int().min(1000).max(9999), active: z.boolean() }),
  },
};

export const crud = createCrudHandlers({ getDb, resources, isAuthorized: async () => !!(await getSession()) });
