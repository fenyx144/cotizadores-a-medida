/**
 * Genera un PDF sencillo y elegante (pdf-lib, sin navegador) a partir de
 * secciones con filas "etiqueta: valor", tablas y páginas de plano con
 * anotaciones numeradas. Se usa para exportar leads (toldos) y proyectos (cortinas).
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface PdfSection {
  heading: string;
  rows: [string, string][];
}

export interface PdfTable {
  heading: string;
  columns: { label: string; width: number; align?: "left" | "right" }[]; // anchos en puntos
  rows: string[][];
  totals?: [string, string][]; // filas de totales alineadas a la derecha
}

/** Anotación sobre un plano, en coordenadas relativas 0-1. */
export interface PdfAnnotation {
  label: string;
  shape: "point" | "rect";
  x: number;
  y: number;
  w?: number;
  h?: number;
  color: string; // #RRGGBB
}

export interface PdfPlan {
  heading: string;
  image: Uint8Array;
  mime: "image/png" | "image/jpeg";
  annotations: PdfAnnotation[];
}

export interface PdfDocumentInput {
  brand: string;
  title: string;
  subtitle?: string;
  sections: PdfSection[];
  tables?: PdfTable[];
  plans?: PdfPlan[];
  footer?: string;
  accentHex?: string; // color de marca (por defecto terracota)
}

const INK = rgb(0.13, 0.12, 0.11);
const MUTED = rgb(0.45, 0.42, 0.38);
const TERRACOTA = rgb(0.71, 0.34, 0.18);

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}
const LINE = rgb(0.85, 0.82, 0.76);

/** Las fuentes estándar de PDF no soportan todos los caracteres: limpiamos los raros. */
function safe(text: string): string {
  return text.replace(/[–—]/g, "-").replace(/[“”]/g, '"').replace(/[^\x20-\x7E\u00A0-\u00FF€]/g, "");
}

/** Corta un texto largo en líneas que quepan en `maxWidth`. */
function wrap(text: string, font: { widthOfTextAtSize(t: string, s: number): number }, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
        out.push(line);
        line = word;
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

export async function buildPdf(input: PdfDocumentInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ACCENT = input.accentHex ? hexToRgb(input.accentHex) : TERRACOTA;
  let page = doc.addPage([595, 842]); // A4
  const margin = 56;
  let y = 842 - margin;

  const ensure = (h: number) => {
    if (y - h < margin + 30) {
      page = doc.addPage([595, 842]);
      y = 842 - margin;
    }
  };

  page.drawText(safe(input.brand), { x: margin, y, size: 11, font: sansBold, color: ACCENT });
  y -= 36;
  page.drawText(safe(input.title), { x: margin, y, size: 26, font: serif, color: INK });
  y -= 20;
  if (input.subtitle) {
    page.drawText(safe(input.subtitle), { x: margin, y, size: 10, font: sans, color: MUTED });
    y -= 14;
  }

  for (const section of input.sections) {
    ensure(60);
    y -= 18;
    page.drawLine({ start: { x: margin, y }, end: { x: 595 - margin, y }, thickness: 0.6, color: LINE });
    y -= 22;
    page.drawText(safe(section.heading), { x: margin, y, size: 14, font: serif, color: INK });
    y -= 20;
    for (const [label, value] of section.rows) {
      const lines = wrap(safe(value || "-"), sans, 10, 330);
      ensure(lines.length * 14 + 4);
      page.drawText(safe(label), { x: margin, y, size: 9, font: sans, color: MUTED });
      lines.forEach((l, i) => page.drawText(l, { x: margin + 150, y: y - i * 14, size: 10, font: sans, color: INK }));
      y -= lines.length * 14 + 4;
    }
  }

  // Tablas (p. ej. líneas del proyecto): encabezado fino y filas compactas.
  for (const table of input.tables ?? []) {
    ensure(80);
    y -= 18;
    page.drawLine({ start: { x: margin, y }, end: { x: 595 - margin, y }, thickness: 0.6, color: LINE });
    y -= 22;
    page.drawText(safe(table.heading), { x: margin, y, size: 14, font: serif, color: INK });
    y -= 20;
    const drawRow = (cells: string[], font: typeof sans, color = INK) => {
      let x = margin;
      table.columns.forEach((col, i) => {
        let text = safe(cells[i] ?? "");
        while (text.length > 1 && font.widthOfTextAtSize(text, 8) > col.width - 4) text = text.slice(0, -2) + ".";
        const tx = col.align === "right" ? x + col.width - 4 - font.widthOfTextAtSize(text, 8) : x;
        page.drawText(text, { x: tx, y, size: 8, font, color });
        x += col.width;
      });
    };
    const header = () => {
      drawRow(table.columns.map((c) => c.label), sansBold, MUTED);
      y -= 5;
      page.drawLine({ start: { x: margin, y }, end: { x: 595 - margin, y }, thickness: 0.4, color: LINE });
      y -= 11;
    };
    header();
    for (const row of table.rows) {
      if (y < margin + 40) {
        page = doc.addPage([595, 842]);
        y = 842 - margin;
        header();
      }
      drawRow(row, sans);
      y -= 13;
    }
    for (const [label, value] of table.totals ?? []) {
      ensure(16);
      y -= 3;
      page.drawText(safe(label), { x: 595 - margin - 200, y, size: 9, font: sans, color: MUTED });
      const v = safe(value);
      page.drawText(v, { x: 595 - margin - 4 - sansBold.widthOfTextAtSize(v, 10), y, size: 10, font: sansBold, color: INK });
      y -= 13;
    }
  }

  // Páginas de plano (A4 apaisado): imagen ajustada + anotaciones numeradas.
  for (const plan of input.plans ?? []) {
    const p = doc.addPage([842, 595]);
    const img = plan.mime === "image/png" ? await doc.embedPng(plan.image) : await doc.embedJpg(plan.image);
    const m = 36;
    p.drawText(safe(plan.heading), { x: m, y: 595 - m, size: 13, font: serif, color: INK });
    const boxW = 842 - m * 2;
    const boxH = 595 - m * 2 - 24;
    const scale = Math.min(boxW / img.width, boxH / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const ox = m + (boxW - w) / 2;
    const oy = m + (boxH - h) / 2;
    p.drawImage(img, { x: ox, y: oy, width: w, height: h });
    p.drawRectangle({ x: ox, y: oy, width: w, height: h, borderColor: LINE, borderWidth: 0.5 });
    for (const a of plan.annotations) {
      const color = hexToRgb(a.color);
      // En PDF el eje Y crece hacia arriba: invertimos la coordenada relativa.
      const ax = ox + a.x * w;
      const ay = oy + (1 - a.y) * h;
      if (a.shape === "rect" && a.w && a.h) {
        p.drawRectangle({ x: ax, y: ay - a.h * h, width: a.w * w, height: a.h * h, borderColor: color, borderWidth: 1, opacity: 0, borderOpacity: 1 });
        p.drawText(safe(a.label), { x: ax, y: ay + 2, size: 6, font: sansBold, color });
      } else {
        p.drawCircle({ x: ax, y: ay, size: 5.5, color });
        const t = safe(a.label);
        const tw = sansBold.widthOfTextAtSize(t, 5);
        p.drawText(t, { x: ax - tw / 2, y: ay - 1.8, size: 5, font: sansBold, color: rgb(1, 1, 1) });
      }
    }
  }

  if (input.footer) {
    doc.getPages().forEach((p) => p.drawText(safe(input.footer!), { x: margin, y: 30, size: 8, font: sans, color: MUTED }));
  }
  return doc.save();
}
