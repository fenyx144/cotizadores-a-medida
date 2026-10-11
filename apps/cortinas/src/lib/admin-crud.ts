/** Recursos del CRUD del panel: tabla de Drizzle + validación Zod. */
import "server-only";
import { z } from "zod";
import { createCrudHandlers, type CrudResource } from "@portafolio/core/crud";
import { getDb, schema } from "./db";
import { getSession } from "./session";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color en formato #RRGGBB");
const cm = z.number().int().min(10, "Mínimo 10 cm").max(2000);
const money = z.number().min(0, "No puede ser negativo");
const optionRef = z.string().regex(/^(tela|perfil|accionamiento|material|producto|familia):[\w-]+$/, "Opción no válida");
const idList = z.string().regex(/^[\w,]*$/);
const cmOpt = z.number().int().min(10).max(2000).nullable();

const resources: Record<string, CrudResource> = {
  products: {
    table: schema.productModels,
    orderBy: schema.productModels.sortOrder,
    schema: z.object({
      name: z.string().min(2), slug: z.string().regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
      type: z.enum(["enrollable", "dual", "vertical", "veneciana"]), material: z.enum(["screen", "blackout", "mixto", "pvc", "aluminio"]),
      uses: z.string().regex(/^[a-z,]*$/, "Ej: educacion,oficinas"), tagline: z.string(), description: z.string(), image: z.string(),
      minWidth: cm, maxWidth: cm, minProjection: cm, maxProjection: cm, basePrice: money, pricePerM2: money, sortOrder: z.number().int(), active: z.boolean(), familyId: z.coerce.number().int().nullable().catch(null),
      specs: z.array(z.object({ label: z.string().min(1).max(60), value: z.string().min(1).max(200) })).max(30).default([]),
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
  families: {
    table: schema.productFamilies,
    orderBy: schema.productFamilies.sortOrder,
    schema: z.object({
      name: z.string().min(2), description: z.string(), requiresFabric: z.boolean(), requiresFrame: z.boolean(), requiresDrive: z.boolean(),
      minWidth: cm, maxWidth: cm, minHeight: cm, maxHeight: cm, allowedDrives: idList, allowedFrameIds: idList, allowedFabricIds: idList, sortOrder: z.number().int(),
    }),
  },
  constraints: {
    table: schema.constraintRules,
    schema: z
      .object({
        name: z.string().min(2), kind: z.enum(["incompatibilidad", "dimension"]), familyId: z.coerce.number().int().nullable().catch(null), modelId: z.coerce.number().int().nullable().catch(null),
        ifOption: optionRef.nullable(), thenOption: optionRef.nullable(), minWidth: cmOpt, maxWidth: cmOpt, minHeight: cmOpt, maxHeight: cmOpt,
        message: z.string().max(200), active: z.boolean(),
      })
      .refine((r) => r.kind !== "incompatibilidad" || (r.ifOption && r.thenOption), { message: "Elija la opción A y la opción B", path: ["thenOption"] })
      .refine((r) => r.kind !== "dimension" || [r.minWidth, r.maxWidth, r.minHeight, r.maxHeight].some((v) => v != null), { message: "Indique al menos un límite", path: ["maxWidth"] }),
  },
  rules: {
    table: schema.priceRules,
    schema: z.object({
      name: z.string().min(2), kind: z.enum(["fijo", "por_m2", "porcentaje"]), amount: z.number(),
      drive: z.enum(["manual", "motor", "sensor"]).nullable(), modelType: z.string().nullable(), minArea: z.number().min(0).nullable(), active: z.boolean(),
      optionRef: optionRef.nullable().default(null),
    }),
  },
};

export const crud = createCrudHandlers({ getDb, resources, isAuthorized: async () => !!(await getSession()) });
