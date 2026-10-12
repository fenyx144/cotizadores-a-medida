/** Recursos del CRUD del panel: tabla de Drizzle + validación Zod. */
import "server-only";
import { z } from "zod";
import { createCrudHandlers, type CrudResource } from "@portafolio/core/crud";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { getDb, schema } from "./db";
import { skuPart, skuPrefix } from "./admin-fields";
import { getSession } from "./session";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color en formato #RRGGBB");
const ignored = z.any().optional().transform(() => undefined);
const cm = z.number().int().min(10, "Mínimo 10 cm").max(2000);
const money = z.number().min(0, "No puede ser negativo");
const optionRef = z.string().regex(/^(v|material|producto|familia):[\w-]+$/, "Opción no válida");
const hexOpt = z.string().regex(/^(#[0-9a-fA-F]{6})?$/, "Color en formato #RRGGBB");
const idList = z.string().regex(/^[\w,]*$/);
const cmOpt = z.number().int().min(10).max(2000).nullable();

const slugify = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "material";
const attrConf = z.array(z.object({ attributeId: z.number().int(), required: z.boolean(), valueIds: z.array(z.number().int()), material: z.string().max(60).optional() }));
const valueRow = z.object({ id: z.number().int().optional().nullable(), name: z.string().trim().min(1, "Indique el nombre").max(80), hex: hexOpt.nullable().transform((v) => v ?? ""), image: z.string().max(500).default("") });

/** Slug único a partir del nombre ("roller-blackout", "roller-blackout-2"…). */
export async function uniqueSlug(db: Parameters<NonNullable<CrudResource["beforeSave"]>>[1], table: typeof schema.materials | typeof schema.productModels, name: string) {
  const base = slugify(name);
  const taken = new Set((await db.select({ s: table.slug }).from(table)).map((x: { s: string }) => x.s));
  let slug = base, n = 2;
  while (taken.has(slug)) slug = `${base}-${n++}`;
  return slug;
}

export const resources: Record<string, CrudResource> = {
  products: {
    table: schema.productModels,
    orderBy: schema.productModels.sortOrder,
    schema: z.object({
      name: z.string().min(2), slug: z.string().regex(/^[a-z0-9-]*$/, "Solo minúsculas, números y guiones").default(""),
      type: z.enum(["enrollable", "dual", "vertical", "veneciana"]).catch("enrollable"), material: z.string().regex(/^[a-z0-9-]*$/).catch(""), materials: z.string().regex(/^[a-z0-9,-]*$/).min(1, "Elija al menos un material").default(""),
      uses: z.preprocess((v) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[,;]/).map((x) => x.trim().replace(/\s+/g, "-")).filter(Boolean).join(","), z.string().regex(/^[a-z,-]*$/, "Solo usos de la lista")), tagline: z.string().default(""), description: z.string().default(""), image: z.string().min(1, "Suba una foto principal"), gallery: z.array(z.string()).max(6, "Máximo 6 fotos").default([]),
      minWidth: cm, maxWidth: cm, minProjection: cm, maxProjection: cm, basePrice: money.catch(0), pricePerM2: money.catch(0), sortOrder: z.number().int().min(1).nullable().catch(null), active: z.boolean(), familyId: z.coerce.number().int().nullable().catch(null),
      specs: z.array(z.object({ label: z.string().min(1).max(60), value: z.string().min(1).max(200) })).max(30).default([]),
      attributes: attrConf.default([]),
    }),
    // Dirección web automática desde el nombre al crear (única); al editar se conserva.
    beforeSave: async (data, db, id) => {
      if (id) { if (!data.slug) delete data.slug; return; }
      if (data.slug) return;
      data.slug = await uniqueSlug(db, schema.productModels, String(data.name ?? ""));
    },
  },
  fabrics: {
    table: schema.fabrics,
    orderBy: schema.fabrics.sortOrder,
    schema: z.object({ name: z.string().min(2), code: z.string(), collection: z.string(), hex, types: z.string(), surchargePerM2: money, sortOrder: z.number().int().min(1, "Desde 1").nullable().default(null), active: z.boolean() }),
  },
  frames: {
    table: schema.frameColors,
    orderBy: schema.frameColors.sortOrder,
    schema: z.object({ name: z.string().min(2), ral: z.string(), hex, surcharge: money, sortOrder: z.number().int().min(1, "Desde 1").nullable().default(null), active: z.boolean() }),
  },
  attributes: {
    table: schema.attributes,
    orderBy: schema.attributes.id,
    schema: z.object({ name: z.string().trim().min(2, "Indique el nombre").max(60), kind: z.enum(["lista", "numero", "sino"]), scope: z.enum(["generico", "material"]).default("generico"), unit: z.string().max(10).default(""), sortOrder: z.number().int().min(1, "Desde 1").nullable().default(null),
      values: z.array(valueRow).max(200).optional() }),
    // Valores editados dentro del atributo: actualiza, crea y borra filas (orden = posición en la lista).
    beforeSave: async (data) => { const v = data.values; delete data.values; return v; },
    afterSave: async (row, extra, db) => {
      const list = extra as z.infer<typeof valueRow>[] | undefined;
      const attributeId = Number(row.id);
      if (list) {
        const keep = list.filter((v) => v.id).map((v) => v.id!) ;
        await db.delete(schema.attributeValues).where(keep.length ? and(eq(schema.attributeValues.attributeId, attributeId), notInArray(schema.attributeValues.id, keep)) : eq(schema.attributeValues.attributeId, attributeId));
        for (const [i, v] of list.entries()) {
          const set = { name: v.name, hex: v.hex, image: v.image, sortOrder: i + 1 };
          if (v.id) await db.update(schema.attributeValues).set(set).where(and(eq(schema.attributeValues.id, v.id), eq(schema.attributeValues.attributeId, attributeId)));
          else await db.insert(schema.attributeValues).values({ ...set, attributeId, surcharge: 0, surchargeKind: "fijo" });
        }
      }
      const values = await db.select().from(schema.attributeValues).where(eq(schema.attributeValues.attributeId, attributeId)).orderBy(schema.attributeValues.id);
      return { values: values.map((v) => ({ id: v.id, name: v.name, hex: v.hex, image: v.image })) };
    },
  },
  values: {
    table: schema.attributeValues,
    orderBy: schema.attributeValues.id,
    schema: z.object({
      attributeId: z.coerce.number().int().min(1, "Elija el atributo"), name: z.string().trim().min(1, "Indique el nombre").max(80), code: z.string().max(40).default(""),
      hex: hexOpt.nullable().transform((v) => v ?? ""), image: z.string().max(500).default(""), surcharge: z.number().min(-5000).max(5000), surchargeKind: z.enum(["fijo", "por_m2"]), onlyFor: z.string().regex(/^[a-z0-9,-]*$/, "Ej.: screen,mixto").default(""),
      active: z.boolean(), sortOrder: z.number().int().min(1, "Desde 1").nullable().default(null),
    }),
  },
  variants: {
    table: schema.productVariants,
    orderBy: schema.productVariants.sortOrder,
    schema: z.object({
      modelId: z.coerce.number().int().min(1, "Elija un producto"), code: z.string().trim().max(40).optional(), name: z.string().trim().min(2).max(80),
      valueIds: idList.default(""), material: z.string().nullable().transform((v) => v ?? "").default(""),
      attributes: z.string().max(200).default(""), priceAdjustment: z.number().int().min(-5000).max(5000).default(0), sortOrder: z.number().int().min(1, "Desde 1").nullable().default(null), active: z.boolean(),
    }),
    // SKU automático si viene vacío: iniciales del producto + valor de cada atributo fijo.
    beforeSave: async (data, db, id) => {
      if (data.code) return;
      if (id && data.modelId === undefined && data.valueIds === undefined) return;
      const cur = id ? (await db.select().from(schema.productVariants).where(eq(schema.productVariants.id, id)))[0] : undefined;
      const modelId = Number(data.modelId ?? cur?.modelId);
      const valueIds = String(data.valueIds ?? cur?.valueIds ?? "").split(",").filter(Boolean).map(Number);
      const [model] = await db.select().from(schema.productModels).where(eq(schema.productModels.id, modelId));
      const vals = valueIds.length ? await db.select().from(schema.attributeValues).where(inArray(schema.attributeValues.id, valueIds)) : [];
      const attrs = await db.select().from(schema.attributes);
      const per = new Map<number, typeof vals>();
      for (const v of vals) per.set(v.attributeId, [...(per.get(v.attributeId) ?? []), v]);
      const order = (a: number) => attrs.find((x) => x.id === a)?.sortOrder ?? 0;
      const parts = [...per.entries()].filter(([, g]) => g.length === 1).sort((x, y) => order(x[0]) - order(y[0])).map(([, g]) => skuPart(g[0]));
      data.code = [model ? skuPrefix(model.slug) : "V", ...parts].join("-").slice(0, 40);
    },
  },
  materials: {
    table: schema.materials,
    orderBy: schema.materials.sortOrder,
    schema: z.object({ name: z.string().min(2), slug: z.string().regex(/^[a-z0-9-]*$/, "Solo minúsculas, números y guiones").default(""), description: z.string().default(""), price: money.default(0), priceUnit: z.enum(["m2", "ml"]).default("m2"), sortOrder: z.number().int().min(1, "Desde 1").nullable().default(null), active: z.boolean(),
      attributes: z.array(z.object({ attributeId: z.number().int(), required: z.boolean(), valueIds: z.array(z.number().int()) })).default([]) }),
    // Código interno automático desde el nombre (único).
    beforeSave: async (data, db, id) => {
      if (data.slug || (id && data.slug === undefined)) return;
      if (id) { delete data.slug; return; }
      data.slug = await uniqueSlug(db, schema.materials, String(data.name ?? ""));
    },
  },
  families: {
    table: schema.productFamilies,
    orderBy: schema.productFamilies.sortOrder,
    schema: z.object({
      name: z.string().min(2), description: z.string(), materials: z.string().regex(/^[a-z0-9,-]*$/).default(""),
      attributes: z.array(z.object({ attributeId: z.number().int(), required: z.boolean(), valueIds: z.array(z.number().int()), material: z.string().max(60).optional() })).default([]),
      // Medidas: ya no se editan en la categoría (vienen del producto); se ignoran si llegan.
      minWidth: ignored, maxWidth: ignored, minHeight: ignored, maxHeight: ignored, sortOrder: z.number().int().min(1, "Desde 1").nullable().default(null),
    }),
  },
  constraints: {
    table: schema.constraintRules,
    schema: z
      .object({
        name: z.string().trim().min(2, "Ponga un nombre a la regla").max(120), kind: z.enum(["bloquear", "permitir", "medidas", "recargo"]),
        familyId: z.coerce.number().int().nullable().catch(null), modelId: z.coerce.number().int().nullable().catch(null),
        conditions: z.array(z.object({
          kind: z.enum(["atributo", "material", "ancho", "alto"]).default("atributo"), attributeId: z.number().int().default(0), valueIds: z.array(z.number().int()).default([]),
          materials: z.array(z.string()).optional(), op: z.enum(["gt", "lt"]).optional(), value: z.number().int().min(1).max(2000).optional(),
        }).refine((k) => (k.kind === "atributo" ? k.attributeId > 0 && k.valueIds.length > 0 : k.kind === "material" ? !!k.materials?.length : k.value != null && !!k.op), { message: "Complete cada condición" })).max(6).default([]),
        targetAttributeId: z.number().int().nullable().default(null), targetValueIds: z.array(z.number().int()).default([]),
        minWidth: cmOpt.default(null), maxWidth: cmOpt.default(null), minHeight: cmOpt.default(null), maxHeight: cmOpt.default(null),
        surcharge: z.number().min(-5000).max(5000).default(0), surchargeKind: z.enum(["fijo", "por_m2"]).default("fijo"),
        message: z.string().max(200).default(""), active: z.boolean().default(true), source: z.string().max(60).default(""),
      })
      .refine((r) => !["bloquear", "permitir"].includes(r.kind) || (r.targetAttributeId && (r.kind === "permitir" || r.targetValueIds.length)), { message: "Elija el atributo y los valores", path: ["targetValueIds"] })
      .refine((r) => r.kind !== "medidas" || [r.minWidth, r.maxWidth, r.minHeight, r.maxHeight].some((v) => v != null), { message: "Indique al menos un límite", path: ["maxWidth"] })
      .refine((r) => r.kind !== "recargo" || r.surcharge !== 0, { message: "Indique el importe", path: ["surcharge"] }),
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
