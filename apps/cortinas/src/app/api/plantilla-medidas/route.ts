/** Plantilla de la planilla de líneas: CSV (por defecto) o Excel (?formato=xlsx). Columnas según los atributos del catálogo. */
import { buildXlsx } from "@portafolio/core/xlsx";
import { getCatalog } from "@/lib/catalog";
import { evaluate, gridAttributes, productMaterials, variantGroups, withDefaults } from "@/lib/rules";

export const dynamic = "force-dynamic";

const EXAMPLE: [string, string, number, number, number][] = [
  ["Aula 101", "roller-screen", 180, 160, 4],
  ["Aula 102", "roller-screen", 180, 160, 4],
  ["Sala de reuniones", "roller-blackout", 120, 200, 2],
];

export async function GET(req: Request) {
  const catalog = await getCatalog();
  const attrs = gridAttributes(catalog);
  const headers = ["ubicacion", "producto", "variante", "ancho_cm", "alto_cm", "cantidad", ...attrs.map((a) => a.name.toLowerCase()), "nota"];
  const rows = EXAMPLE.flatMap(([loc, slug, w, h, q]) => {
    const model = catalog.models.find((m) => m.slug === slug);
    if (!model) return [];
    const values = withDefaults(catalog, { modelId: model.id });
    const cells = attrs.map((a) => {
      const v = values[a.id];
      if (a.kind === "sino") return v === true ? "sí" : v === false ? "no" : "";
      if (a.kind === "numero") return v == null ? "" : String(v);
      if (a.id === -1) return catalog.materials.find((x) => x.id === v)?.name ?? "";
      return catalog.values.find((x) => x.id === v)?.name ?? "";
    });
    // Segunda fila de ejemplo con variante (si el producto tiene).
    const v = loc === "Aula 102" ? (catalog.variants ?? []).find((x) => x.active && x.modelId === model.id) : undefined;
    return [[loc, model.name, v?.code ?? "", w, h, q, ...cells, ""]];
  });
  if (new URL(req.url).searchParams.get("formato") === "xlsx") {
    const keys = headers.map((_, i) => `c${i}`);
    const fam = (id: number | null) => catalog.families.find((f) => f.id === id)?.name ?? "";
    const valName = (id: number) => catalog.values.find((x) => x.id === id)?.name ?? "";
    const attrName = (id: number) => catalog.attributes.find((x) => x.id === id)?.name ?? "";
    const buf = await buildXlsx([
      { name: "Pedido", columns: headers.map((h, i) => ({ header: h, key: keys[i], width: i < 3 ? 24 : i < 6 ? 10 : 18 })),
        rows: rows.map((r) => Object.fromEntries(r.map((v, i) => [keys[i], v]))) },
      { name: "Productos", columns: [{ header: "producto", key: "p", width: 30 }, { header: "código", key: "c", width: 22 }, { header: "categoría", key: "f", width: 24 }, { header: "materiales", key: "m", width: 30 }],
        rows: catalog.models.map((m) => ({ p: m.name, c: m.slug, f: fam(m.familyId), m: productMaterials(catalog, m).map((x) => x.name).join(" + ") })) },
      { name: "Variantes", columns: [{ header: "código", key: "c", width: 18 }, { header: "variante", key: "n", width: 28 }, { header: "producto", key: "p", width: 28 }, { header: "valores fijos", key: "v", width: 50 }],
        rows: (catalog.variants ?? []).map((v) => ({ c: v.code, n: v.name, p: catalog.models.find((m) => m.id === v.modelId)?.name ?? "",
          v: [...variantGroups(catalog, v)].map(([a, g]) => `${attrName(a)}: ${g.map(valName).join(" o ")}`).join(" · ") })) },
      { name: "Valores", columns: [{ header: "producto", key: "p", width: 28 }, { header: "columna", key: "a", width: 20 }, { header: "valores válidos", key: "v", width: 70 }],
        rows: catalog.models.flatMap((m) => evaluate(catalog, { modelId: m.id }).fields.map((f) => ({ p: m.name, a: f.attribute.name.toLowerCase(),
          v: f.kind === "sino" ? "sí / no" : f.kind === "numero" ? `número${f.attribute.unit ? ` (${f.attribute.unit})` : ""}` : f.choices.map((x) => x.label).join(" | ") }))) },
    ], "Cota");
    return new Response(buf as unknown as BodyInit, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="plantilla-pedido-cota.xlsx"' } });
  }
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  // BOM al inicio para que Excel abra bien las tildes.
  return new Response("\uFEFF" + csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="plantilla-lineas-cota.csv"' } });
}
