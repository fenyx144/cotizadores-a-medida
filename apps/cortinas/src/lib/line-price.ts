/**
 * Precio de una línea: producto + recargos de los valores elegidos + reglas de precio
 * + ajuste de la variante. Devuelve también la config guardada (con nombres) para la línea.
 */
import { calculatePrice, type PricingRule } from "@portafolio/core/pricing";
import type { LineConfig, LineOption } from "@portafolio/core/db/project-schema";
import { evaluate, matchVariant, ruleSurcharges, selectionRefs, selectedValueIds, type RulesCatalog, type Values } from "./rules";

export interface CatalogData extends RulesCatalog {
  rules: PricingRule[];
}

export interface LineInput {
  modelId: number;
  values: Values;
  width: number;
  height: number;
}

/** Opciones elegidas como texto, en el orden de la familia. */
export function lineOptions(catalog: RulesCatalog, sel: { modelId: number; values: Values }): LineOption[] {
  const out: LineOption[] = [];
  for (const f of evaluate(catalog, { modelId: sel.modelId, values: sel.values }).fields) {
    const raw = sel.values[f.attribute.id];
    if (raw == null || raw === false) continue;
    if (f.kind === "numero") { out.push({ attributeId: f.attribute.id, attribute: f.attribute.name, value: `${raw}${f.attribute.unit ? ` ${f.attribute.unit}` : ""}` }); continue; }
    const v = f.kind === "sino" ? catalog.values.find((x) => x.attributeId === f.attribute.id && x.active) : catalog.values.find((x) => x.id === raw);
    if (!v) continue;
    out.push({ attributeId: f.attribute.id, attribute: f.attribute.name, valueId: v.id, value: f.kind === "sino" ? f.attribute.name : v.name, code: v.code || undefined, hex: v.hex || undefined });
  }
  return out;
}

/**
 * Convierte una elección en la config guardada y su precio unitario.
 * Devuelve null si el producto no existe.
 */
export function priceLine(catalog: CatalogData, input: LineInput): { config: LineConfig; unitPrice: number } | null {
  const model = catalog.models.find((m) => m.id === input.modelId);
  if (!model) return null;
  const sel = { modelId: model.id, values: input.values };
  const refs = selectionRefs(catalog, sel);
  // Recargos de los valores elegidos, como reglas de precio (fijo o por m²).
  const surcharges: PricingRule[] = selectedValueIds(catalog, sel)
    .map((id) => catalog.values.find((v) => v.id === id))
    .filter((v) => v && v.surcharge)
    .map((v) => ({ id: -v!.id, name: v!.name, kind: v!.surchargeKind === "por_m2" ? "por_m2" : "fijo", amount: v!.surcharge, drive: null, modelType: null, minArea: null, active: true }));
  for (const r of ruleSurcharges(catalog, sel))
    surcharges.push({ id: -100000 - r.id, name: r.name, kind: r.surchargeKind === "por_m2" ? "por_m2" : "fijo", amount: r.surcharge, drive: null, modelType: null, minArea: null, active: true });
  const result = calculatePrice(
    { modelId: model.id, width: input.width, projection: input.height, fabricId: 0, frameColorId: 0, drive: "manual" },
    { model, rules: [...surcharges, ...catalog.rules.map((r) => ({ ...r, drive: null }))], refs },
  );
  const variant = matchVariant(catalog, sel);
  // El ajuste de la variante se suma al precio unitario (redondeado a la decena, como el resto).
  const unitPrice = variant?.priceAdjustment ? Math.round((result.total + variant.priceAdjustment) / 10) * 10 : result.total;
  return {
    config: {
      modelId: model.id,
      modelName: model.name,
      modelType: model.type,
      values: input.values,
      options: lineOptions(catalog, sel),
      variantId: variant?.id ?? null,
      variantCode: variant?.code ?? null,
      variantName: variant?.name ?? null,
    },
    unitPrice,
  };
}
