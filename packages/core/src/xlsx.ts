/**
 * Exportación a Excel (.xlsx) con exceljs. Genérico: hojas con columnas y filas.
 */
import ExcelJS from "exceljs";

export interface XlsxSheet {
  name: string;
  columns: { header: string; key: string; width?: number; numFmt?: string }[];
  rows: Record<string, string | number | null>[];
}

export async function buildXlsx(sheets: XlsxSheet[], creator = "Portafolio"): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = creator;
  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name.slice(0, 31));
    ws.columns = s.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 14, style: c.numFmt ? { numFmt: c.numFmt } : {} }));
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).border = { bottom: { style: "thin" } };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    s.rows.forEach((r) => ws.addRow(r));
  }
  const buffer = await wb.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}
