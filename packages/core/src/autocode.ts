/** Códigos sugeridos (SKU) a partir de otros campos del formulario. */
export interface AutoCode { prefix: { field: string; map: Record<string, string> }; parts: { field: string; map: Record<string, { code: string; order: number; attr: number }> } }

/** SKU sugerido: prefijo del producto + código de cada valor fijo (atributos con un solo valor), en orden de atributo. */
export function suggestCode(a: AutoCode, row: Record<string, unknown>): string {
  const pre = a.prefix.map[String(row[a.prefix.field] ?? "")] ?? "";
  const picked = String(row[a.parts.field] ?? "").split(",").map((x) => x.trim()).filter(Boolean).map((id) => a.parts.map[id]).filter(Boolean);
  const per = new Map<number, typeof picked>();
  for (const p of picked) per.set(p.attr, [...(per.get(p.attr) ?? []), p]);
  const parts = [...per.values()].filter((g) => g.length === 1).map((g) => g[0]).sort((x, y) => x.order - y.order).map((x) => x.code);
  return [pre, ...parts].filter(Boolean).join("-");
}
