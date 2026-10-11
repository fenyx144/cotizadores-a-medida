/** Recursos del CRUD del panel: tabla de Drizzle + validación Zod. */
import "server-only";
import { z } from "zod";
import { createCrudHandlers, type CrudResource } from "@portafolio/core/crud";
import { getDb, schema } from "./db";
import { getSession } from "./session";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color en formato #RRGGBB");
const cm = z.number().int().min(10, "Mínimo 10 cm").max(2000);
const money = z.number().min(0, "No puede ser negativo");
const optionRef = z.string().regex(/^(v|material|producto|familia):[\w-]+$/, "Opción no válida");
const hexOpt = z.string().regex(/^(#[0-9a-fA-F]{6})?$/, "Color en formato #RRGGBB");
const idList = z.string().regex(/^[\w,]*$/);
const cmOpt = z.number().int().min(10).max(2000).nullable();

const resources: Record<string, CrudResource> = {
  products: {
    table: schema.productModels,
    orderBy: schema.productModels.sortOrder,
    schema: z.object({
      name: z.string().min(2), slug: z.string().regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
      type: z.enum(["enrollable", "dual", "vertical", "veneciana"]), material: z.string().regex(/^[a-z0-9-]+$/, "Elija un material"),
      uses: z.string().regex(/^[a-z,]*$/, "Ej: educacion,oficinas"), tagline: z.string(), description: z.string(), image: z.string().min(1, "Suba una foto principal"), gallery: z.array(z.string()).max(6, "Máximo 6 fotos").default([]),
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
  attributes: {
    table: schema.attributes,
    orderBy: schema.attributes.sortOrder,
    schema: z.object({ name: z.string().trim().min(2, "Indique el nombre").max(60), kind: z.enum(["lista", "color", "numero", "sino"]), unit: z.string().max(10).default(""), sortOrder: z.number().int() }),
  },
  values: {
    table: schema.attributeValues,
    orderBy: schema.attributeValues.sortOrder,
    schema: z.object({
      attributeId: z.coerce.number().int().min(1, "Elija el atributo"), name: z.string().trim().min(1, "Indique el nombre").max(80), code: z.string().max(40).default(""),
      hex: hexOpt.default(""), surcharge: z.number().min(-5000).max(5000), surchargeKind: z.enum(["fijo", "por_m2"]), onlyFor: z.string().regex(/^[a-z0-9,-]*$/, "Ej.: screen,mixto").default(""),
      active: z.boolean(), sortOrder: z.number().int(),
    }),
  },
  variants: {
    table: schema.productVariants,
    orderBy: schema.productVariants.sortOrder,
    schema: z.object({
      modelId: z.coerce.number().int().min(1, "Elija un producto"), code: z.string().trim().min(2, "Indique el código").max(40), name: z.string().trim().min(2).max(80),
      valueIds: idList.default(""),
      attributes: z.string().max(200), priceAdjustment: z.number().int().min(-5000).max(5000), sortOrder: z.number().int(), active: z.boolean(),
    }),
  },
  materials: {
    table: schema.materials,
    orderBy: schema.materials.sortOrder,
    schema: z.object({ name: z.string().min(2), slug: z.string().regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"), description: z.string(), sortOrder: z.number().int(), active: z.boolean() }),
  },
  families: {
    table: schema.productFamilies,
    orderBy: schema.productFamilies.sortOrder,
    schema: z.object({
      name: z.string().min(2), description: z.string(),
      attributes: z.array(z.object({ attributeId: z.number().int(), required: z.boolean(), valueIds: z.array(z.number().int()) })).default([]),
      minWidth: cm, maxWidth: cm, minHeight: cm, maxHeight: cm, sortOrder: z.number().int(),
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
      modelType: z.string().nullable(), minArea: z.number().min(0).nullable(), active: z.boolean(),
      optionRef: optionRef.nullable().default(null),
    }),
  },
};

export const crud = createCrudHandlers({ getDb, resources, isAuthorized: async () => !!(await getSession()) });
