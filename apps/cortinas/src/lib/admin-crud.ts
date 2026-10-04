/** Recursos del CRUD del panel: tabla de Drizzle + validación Zod. */
import "server-only";
import { z } from "zod";
import { createCrudHandlers, type CrudResource } from "@portafolio/core/crud";
import { getDb, schema } from "./db";
import { getSession } from "./session";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color en formato #RRGGBB");
const cm = z.number().int().min(10, "Mínimo 10 cm").max(2000);
const money = z.number().min(0, "No puede ser negativo");

const resources: Record<string, CrudResource> = {
  products: {
    table: schema.productModels,
    orderBy: schema.productModels.sortOrder,
    schema: z.object({
      name: z.string().min(2), slug: z.string().regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
      type: z.enum(["enrollable", "dual", "vertical", "veneciana"]), material: z.enum(["screen", "blackout", "mixto", "pvc", "aluminio"]),
      uses: z.string().regex(/^[a-z,]*$/, "Ej: educacion,oficinas"), tagline: z.string(), description: z.string(), image: z.string(),
      minWidth: cm, maxWidth: cm, minProjection: cm, maxProjection: cm, basePrice: money, pricePerM2: money, sortOrder: z.number().int(), active: z.boolean(),
    }),
  },
  fabrics: {
    table: schema.fabrics,
    orderBy: schema.fabrics.sortOrder,
    schema: z.object({ name: z.string().min(2), code: z.string(), collection: z.string(), hex, types: z.string(), surchargePerM2: money, sortOrder: z.number().int(), active: z.boolean() }),
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
};

export const crud = createCrudHandlers({ getDb, resources, isAuthorized: async () => !!(await getSession()) });
