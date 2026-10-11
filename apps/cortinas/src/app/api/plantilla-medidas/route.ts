/** Plantilla de la planilla de líneas: CSV (por defecto) o Excel (?formato=xlsx). */
import { buildXlsx, GRID_HEADERS } from "@portafolio/core/import";

const EXAMPLE = [
  ["Aula 101", "Roller Screen 5%", "180", "160", "4", "Gris perla", "Blanco", "Cadena", ""],
  ["Aula 102", "Roller Screen 5%", "180", "160", "4", "Gris perla", "Blanco", "Cadena", ""],
  ["Sala de reuniones", "Roller Blackout", "120", "200", "2", "Gris piedra", "Gris aluminio", "Motor con mando", "Proyector"],
  ["Dirección", "Persiana de aluminio 25 mm", "90", "140", "1", "Plata", "", "Cadena", ""],
];

export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get("formato") === "xlsx") {
    const buf = await buildXlsx("Líneas", GRID_HEADERS, EXAMPLE.map((r) => r.map((v, i) => (i >= 2 && i <= 4 && v ? Number(v) : v))), [20, 28, 10, 10, 10, 16, 16, 24, 20]);
    return new Response(buf, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="plantilla-lineas-cota.xlsx"' } });
  }
  const csv = [GRID_HEADERS, ...EXAMPLE].map((r) => r.join(",")).join("\n");
  // BOM al inicio para que Excel abra bien las tildes.
  return new Response("\uFEFF" + csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="plantilla-lineas-cota.csv"' } });
}
