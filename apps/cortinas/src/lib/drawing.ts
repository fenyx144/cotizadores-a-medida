/** Dibujo de la vista previa según el atributo "Accionamiento" (cliente y servidor). */
import { TYPE_LABELS } from "./content";

type Cat = { attributes: { id: number; name: string }[]; values: { id: number; attributeId: number; code: string }[]; families?: { id: number; attributes: { attributeId: number; valueIds: number[] }[] }[] };
const accAttr = (c: Cat) => c.attributes.find((a) => a.name === "Accionamiento");
const known = (x?: string | null) => (x && x in TYPE_LABELS ? x : undefined);

/** Código de dibujo según el valor de "Accionamiento" elegido; si no hay, el del producto o enrollable. */
export function drawingType(
  c: Cat,
  values: Record<number, unknown> | null | undefined,
  fallback?: string | null,
): string {
  const attr = accAttr(c);
  const id = attr && values ? values[attr.id] : undefined;
  const code = c.values.find((v) => v.id === id && v.attributeId === attr?.id)?.code;
  return known(code) ?? modelDrawing(c, null, fallback);
}

/** Dibujo por defecto de un producto: el único Accionamiento que permite su categoría, o su tipo antiguo. */
export function modelDrawing(c: Cat, model: { familyId: number | null; type?: string | null } | null, fallback?: string | null): string {
  const attr = accAttr(c);
  const fa = model && attr ? c.families?.find((f) => f.id === model.familyId)?.attributes?.find((a) => a.attributeId === attr.id) : undefined;
  const code = fa?.valueIds.length === 1 ? c.values.find((v) => v.id === fa.valueIds[0])?.code : undefined;
  return known(code) ?? known(model?.type) ?? known(fallback) ?? "enrollable";
}
