/** Plantilla de la planilla de líneas: CSV (por defecto) o Excel (?formato=xlsx). Columnas según los atributos del catálogo. */
import { buildXlsx } from "@portafolio/core/import";
import { getCatalog } from "@/lib/catalog";
import { gridAttributes, withDefaults } from "@/lib/rules";

export const dynamic = "force-dynamic";

const EXAMPLE: [string, string, number, number, number][] = [
  ["Aula 101", "roller-screen", 180, 160, 4],
  ["Aula 102", "roller-screen", 180, 160, 4],
  ["Sala de reuniones", "roller-blackout", 120, 200, 2],
  ["Dirección", "persiana-aluminio", 90, 140, 1],
];

export async function GET(req: Request) {
  const catalog = await getCatalog();
  const attrs = gridAttributes(catalog);
  const headers = ["ubicacion", "producto", "ancho_cm", "alto_cm", "cantidad", ...attrs.map((a) => a.name.toLowerCase()), "nota"];
  const rows = EXAMPLE.flatMap(([loc, slug, w, h, q]) => {
    const model = catalog.models.find((m) => m.slug === slug);
    if (!model) return [];
    const values = withDefaults(catalog, { modelId: model.id });
    const cells = attrs.map((a) => {
      const v = values[a.id];
      if (a.kind === "sino") return v === true ? "sí" : v === false ? "no" : "";
      if (a.kind === "numero") return v == null ? "" : String(v);
      return catalog.values.find((x) => x.id === v)?.name ?? "";
    });
    return [[loc, model.name, w, h, q, ...cells, ""]];
  });
  if (new URL(req.url).searchParams.get("formato") === "xlsx") {
    const buf = await buildXlsx("Líneas", headers, rows, [20, 28, 10, 10, 10, ...attrs.map(() => 18), 20]);
    return new Response(buf, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="plantilla-lineas-cota.xlsx"' } });
  }
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  // BOM al inicio para que Excel abra bien las tildes.
  return new Response("\uFEFF" + csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="plantilla-lineas-cota.csv"' } });
}
