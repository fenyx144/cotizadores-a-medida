"use client";
/** Selector de variante (código de artículo). Elegir una variante fija su tela y color de perfil. */
import type { CatalogData } from "@/lib/line-price";
import { matchVariant, variantsFor } from "@/lib/rules";

export function VariantPicker({ catalog, modelId, fabricId, frameColorId, disabled, onPick, className, labelClass }: {
  catalog: CatalogData; modelId: number; fabricId: number; frameColorId: number; disabled?: boolean;
  onPick: (v: { fabricId: number | null; frameColorId: number | null }) => void; className: string; labelClass: string;
}) {
  const list = variantsFor(catalog, modelId);
  if (!list.length) return null;
  const current = matchVariant(catalog, { modelId, fabricId, frameColorId });
  return (
    <label className="col-span-2" data-testid="variant-picker">
      <span className={labelClass}>Variante</span>
      <select className={className} disabled={disabled} value={current?.id ?? ""} name="variantId"
        onChange={(e) => { const v = list.find((x) => x.id === Number(e.target.value)); if (v) onPick({ fabricId: v.fabricId, frameColorId: v.frameColorId }); }}>
        {!current && <option value="">Sin variante para esta combinación</option>}
        {list.map((v) => <option key={v.id} value={v.id}>{v.code} · {v.name}{v.priceAdjustment ? ` (${v.priceAdjustment > 0 ? "+" : "−"}S/ ${Math.abs(v.priceAdjustment)})` : ""}</option>)}
      </select>
    </label>
  );
}
