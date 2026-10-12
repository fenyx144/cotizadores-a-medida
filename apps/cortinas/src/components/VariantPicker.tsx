"use client";
/** Selector de variante (código de artículo). Elegir una variante fija sus valores de atributo. */
import type { CatalogData } from "@/lib/line-price";
import { matchVariant, variantValues, variantsFor, type Values } from "@/lib/rules";

export function VariantPicker({ catalog, modelId, values, disabled, onPick, className, labelClass }: {
  catalog: CatalogData; modelId: number; values: Values; disabled?: boolean;
  onPick: (v: Values) => void; className: string; labelClass: string;
}) {
  const list = variantsFor(catalog, modelId);
  if (!list.length) return null;
  const current = matchVariant(catalog, { modelId, values });
  return (
    <label className="col-span-2" data-testid="variant-picker">
      <span className={labelClass}>Variante</span>
      <select className={className} disabled={disabled} value={current?.id ?? ""} name="variantId"
        onChange={(e) => { const v = list.find((x) => x.id === Number(e.target.value)); if (v) onPick(variantValues(catalog, v, values)); }}>
        {!current && <option value="">Sin variante para esta combinación</option>}
        {list.map((v) => <option key={v.id} value={v.id}>{v.code} · {v.name}{v.priceAdjustment ? ` (${v.priceAdjustment > 0 ? "+" : "−"}S/ ${Math.abs(v.priceAdjustment)})` : ""}</option>)}
      </select>
    </label>
  );
}
