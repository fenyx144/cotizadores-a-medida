/** Plantilla CSV para importar medidas. */
import { templateCsv } from "@portafolio/core/import";

export function GET() {
  // BOM al inicio para que Excel abra bien las tildes.
  return new Response("\uFEFF" + templateCsv(), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="plantilla-medidas-cota.csv"' },
  });
}
