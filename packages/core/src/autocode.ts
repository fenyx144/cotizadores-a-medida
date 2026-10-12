/** Códigos sugeridos (SKU) a partir de otros campos del formulario. */
export interface AutoCode { prefix: { field: string; map: Record<string, string> }; parts: { field: string; map: Record<string, { code: string; order: number }> } }

/** SKU sugerido: prefijo del producto + códigos de los valores fijos, en orden de atributo. */
export function suggestCode(a: AutoCode, row: Record<string, unknown>): string {
  const pre = a.prefix.map[String(row[a.prefix.field] ?? "")] ?? "";
  const parts = String(row[a.parts.field] ?? "").split(",").filter(Boolean).map((id) => a.parts.map[id]).filter(Boolean)
    .sort((x, y) => x.order - y.order).map((x) => x.code);
  return [pre, ...parts].filter(Boolean).join("-");
}

