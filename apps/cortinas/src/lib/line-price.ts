/**
 * Precio de una línea del proyecto (puro: sin base de datos).
 * Lo usan las acciones del servidor y también el seed.
 */
import { calculatePrice, type Drive, type PricingRule } from "@portafolio/core/pricing";
import type { LineConfig } from "@portafolio/core/db/project-schema";
import type { Fabric, FrameColor, ProductModel } from "@portafolio/core/db/schema";

export interface CatalogData {
  models: ProductModel[];
  fabrics: Fabric[];
  frames: FrameColor[];
  rules: PricingRule[];
}

/**
 * Telas compatibles con un producto. El campo `types` de la tela lista tipos
 * o materiales ("screen,mixto"); vacío = sirve para todos.
 */
export function fabricsFor(catalog: Pick<CatalogData, "fabrics">, model: { type: string; material: string }) {
  return catalog.fabrics.filter((f) => {
    if (!f.types) return true;
    const list = f.types.split(",");
    return list.includes(model.type) || list.includes(model.material);
  });
}

export interface LineInput {
  modelId: number;
  fabricId: number;
  frameColorId: number;
  drive: Drive;
  width: number;
  height: number;
}

/**
 * Convierte una elección (ids) en la config guardada (con nombres) y su
 * precio unitario. Devuelve null si el producto no existe.
 */
export function priceLine(catalog: CatalogData, input: LineInput): { config: LineConfig; unitPrice: number } | null {
  const model = catalog.models.find((m) => m.id === input.modelId);
  if (!model) return null;
  const fabric = fabricsFor(catalog, model).find((f) => f.id === input.fabricId) ?? fabricsFor(catalog, model)[0];
  const frame = catalog.frames.find((f) => f.id === input.frameColorId) ?? catalog.frames[0];
  const result = calculatePrice(
    { modelId: model.id, width: input.width, projection: input.height, fabricId: fabric?.id ?? 0, frameColorId: frame?.id ?? 0, drive: input.drive },
    { model, fabric, frameColor: frame, rules: catalog.rules },
  );
  return {
    config: {
      modelId: model.id,
      modelName: model.name,
      modelType: model.type,
      fabricId: fabric?.id ?? 0,
      fabricName: fabric?.name ?? "",
      fabricHex: fabric?.hex ?? "#cccccc",
      frameColorId: frame?.id ?? 0,
      frameColorName: frame?.name ?? "",
      drive: input.drive,
    },
    unitPrice: result.total,
  };
}
