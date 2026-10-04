/**
 * Importación de medidas desde CSV o Excel (.xlsx).
 *
 * El cliente baja una plantilla, la llena (una fila por ventana o grupo de
 * ventanas iguales) y la sube. Aquí convertimos el archivo en filas
 * validadas y devolvemos los errores por fila para mostrarlos antes de importar.
 */
import ExcelJS from "exceljs";

export interface MeasurementRow {
  building: string;
  floor: string;
  room: string;
  code: string; // V1, V2... (opcional)
  width: number; // cm
  height: number; // cm
  quantity: number;
  product: string; // nombre o slug del producto (opcional)
  note: string;
}

export interface ImportResult {
  rows: MeasurementRow[];
  errors: { row: number; message: string }[];
}

/** Encabezados aceptados (en minúsculas y sin tildes) para cada campo. */
const ALIASES: Record<keyof MeasurementRow, string[]> = {
  building: ["edificio", "pabellon", "bloque", "sede"],
  floor: ["piso", "nivel", "planta"],
  room: ["ambiente", "aula", "oficina", "espacio", "ubicacion"],
  code: ["codigo", "cod", "ventana", "id"],
  width: ["ancho_cm", "ancho", "ancho (cm)"],
  height: ["alto_cm", "alto", "alto (cm)", "caida"],
  quantity: ["cantidad", "cant", "unidades"],
  product: ["producto", "modelo", "tipo"],
  note: ["nota", "observacion", "comentario"],
};

export const TEMPLATE_HEADERS = ["edificio", "piso", "ambiente", "codigo", "ancho_cm", "alto_cm", "cantidad", "producto", "nota"];

/** Plantilla CSV de ejemplo que se ofrece para descargar. */
export function templateCsv(): string {
  return [
    TEMPLATE_HEADERS.join(","),
    "Pabellón A,Piso 1,Aula 101,V1,180,150,3,Roller Screen 5%,",
    "Pabellón A,Piso 1,Dirección,V4,120,140,1,Roller Blackout,Proyector",
  ].join("\n");
}

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

/** Detecta el separador (los Excel en español suelen exportar con ";"). */
function detectDelimiter(firstLine: string): string {
  const counts = [",", ";", "\t"].map((d) => [d, firstLine.split(d).length] as const);
  return counts.sort((a, b) => b[1] - a[1])[0][0];
}

/** Parser CSV pequeño con soporte de comillas ("a, b" y comillas dobles ""). */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(clean.split(/\r?\n/)[0] ?? "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Convierte "1,80" o "1.8" (metros) o "180" (cm) a centímetros. */
export function toCm(value: string): number | null {
  const n = Number(value.replace(",", ".").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  // Si alguien escribió metros (ej. 1.8), lo pasamos a cm.
  return Math.round(n < 10 ? n * 100 : n);
}

/** Valida filas ya separadas en celdas. La primera fila debe ser el encabezado. */
export function parseMeasurementRows(table: string[][]): ImportResult {
  const errors: ImportResult["errors"] = [];
  if (table.length < 2) return { rows: [], errors: [{ row: 1, message: "El archivo está vacío o solo tiene encabezado." }] };

  const header = table[0].map(normalize);
  const index = {} as Record<keyof MeasurementRow, number>;
  for (const [field, aliases] of Object.entries(ALIASES) as [keyof MeasurementRow, string[]][]) {
    index[field] = header.findIndex((h) => aliases.includes(h));
  }
  for (const required of ["room", "width", "height"] as const) {
    if (index[required] < 0) errors.push({ row: 1, message: `Falta la columna "${ALIASES[required][0]}".` });
  }
  if (errors.length) return { rows: [], errors };

  const rows: MeasurementRow[] = [];
  table.slice(1).forEach((cells, i) => {
    const rowNumber = i + 2; // +1 por el encabezado, +1 porque Excel empieza en 1
    const get = (f: keyof MeasurementRow) => (index[f] >= 0 ? String(cells[index[f]] ?? "").trim() : "");
    const width = toCm(get("width"));
    const height = toCm(get("height"));
    const qtyRaw = get("quantity");
    const quantity = qtyRaw ? Number(qtyRaw) : 1;
    const room = get("room");

    const problems: string[] = [];
    if (!room) problems.push("falta el ambiente");
    if (!width) problems.push("ancho no válido");
    if (!height) problems.push("alto no válido");
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) problems.push("cantidad no válida");
    if (width && (width < 30 || width > 600)) problems.push("ancho fuera de rango (30-600 cm)");
    if (height && (height < 30 || height > 600)) problems.push("alto fuera de rango (30-600 cm)");
    if (problems.length) {
      errors.push({ row: rowNumber, message: problems.join(", ") });
      return;
    }
    rows.push({
      building: get("building"),
      floor: get("floor"),
      room,
      code: get("code"),
      width: width!,
      height: height!,
      quantity,
      product: get("product"),
      note: get("note"),
    });
  });
  return { rows, errors };
}

/** Lee un archivo CSV o XLSX (en el servidor) y devuelve las filas validadas. */
export async function parseMeasurementFile(data: Uint8Array, fileName: string): Promise<ImportResult> {
  if (/\.xlsx$/i.test(fileName)) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
    const sheet = wb.worksheets[0];
    if (!sheet) return { rows: [], errors: [{ row: 1, message: "El Excel no tiene hojas." }] };
    const table: string[][] = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values = (row.values as unknown[]).slice(1); // exceljs empieza en el índice 1
      table.push(values.map((v) => (v == null ? "" : typeof v === "object" && "text" in (v as object) ? String((v as { text: string }).text) : String(v))));
    });
    return parseMeasurementRows(table);
  }
  if (/\.(csv|txt)$/i.test(fileName)) return parseMeasurementRows(parseCsv(new TextDecoder().decode(data)));
  return { rows: [], errors: [{ row: 0, message: "Formato no soportado. Usa CSV o Excel (.xlsx)." }] };
}
