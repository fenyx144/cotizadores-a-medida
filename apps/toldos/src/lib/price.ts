/** Ayudas de precio para la web pública (envuelven el motor de packages/core). */
import { calculatePrice } from "@portafolio/core/pricing";
import type { Catalog } from "./catalog";

/** Precio "desde": medida mínima, lona y color sin recargo, accionamiento manual. */
export function fromPrice(model: Catalog["models"][number], catalog: Catalog): number {
  const fabric = [...catalog.fabrics].sort((a, b) => a.surchargePerM2 - b.surchargePerM2)[0];
  const frame = [...catalog.frameColors].sort((a, b) => a.surcharge - b.surcharge)[0];
  const width = Math.max(model.minWidth, model.minProjection);
  return calculatePrice(
    { modelId: model.id, width, projection: model.minProjection, fabricId: fabric?.id ?? 0, frameColorId: frame?.id ?? 0, drive: "manual" },
    { model, fabric, frameColor: frame, rules: catalog.rules },
  ).total;
}
