/**
 * Genera un PDF sencillo y elegante (pdf-lib, sin navegador) a partir de
 * secciones con filas "etiqueta: valor". Se usa para exportar un lead.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface PdfSection {
  heading: string;
  rows: [string, string][];
}

export interface PdfDocumentInput {
  brand: string;
  title: string;
  subtitle?: string;
  sections: PdfSection[];
  footer?: string;
}

const INK = rgb(0.13, 0.12, 0.11);
const MUTED = rgb(0.45, 0.42, 0.38);
const ACCENT = rgb(0.71, 0.34, 0.18); // terracota
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

  if (input.footer) {
    doc.getPages().forEach((p) => p.drawText(safe(input.footer!), { x: margin, y: 30, size: 8, font: sans, color: MUTED }));
  }
  return doc.save();
}
