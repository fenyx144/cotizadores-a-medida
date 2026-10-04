import { describe, expect, it } from "vitest";
import { calibrate, nextLabel, suggestSize, summarizeProject, volumeDiscount } from "../src/projects";
import { parseCsv, parseMeasurementRows, toCm } from "../src/import";
import { buildPdf } from "../src/pdf";
import { buildXlsx } from "../src/xlsx";

describe("descuento por volumen", () => {
  it("aplica el tramo correcto", () => {
    expect(volumeDiscount(5)).toBe(0);
    expect(volumeDiscount(20)).toBe(5);
    expect(volumeDiscount(52)).toBe(8);
    expect(volumeDiscount(130)).toBe(12);
  });
});

describe("resumen del proyecto", () => {
  it("suma por ubicación y producto, descuenta y calcula IGV incluido", () => {
    const s = summarizeProject([
      { locationName: "Aula 101", productName: "Screen", quantity: 12, unitPrice: 300 },
      { locationName: "Aula 102", productName: "Screen", quantity: 10, unitPrice: 300 },
      { locationName: "Aula 103", productName: null, quantity: 3, unitPrice: null },
    ]);
    expect(s.windows).toBe(25);
    expect(s.configured).toBe(22);
    expect(s.pending).toBe(3);
    expect(s.subtotal).toBe(6600);
    expect(s.discountPercent).toBe(5);
    expect(s.total).toBe(6270);
    expect(s.igv).toBe(956);
    expect(s.byLocation).toHaveLength(3);
    expect(s.byProduct).toEqual([{ name: "Screen", quantity: 22, amount: 6600 }]);
  });
});

describe("plano", () => {
  it("numera las anotaciones", () => {
    expect(nextLabel([])).toBe("V1");
    expect(nextLabel(["V1", "V2", "V9", "X3"])).toBe("V10");
  });
  it("calibra y sugiere el ancho desde el rectángulo", () => {
    const img = { width: 5000, height: 3000 };
    // Dos puntos separados 500 px que miden 10 m -> 0,02 m/px
    const mpp = calibrate({ x: 0.1, y: 0.5 }, { x: 0.2, y: 0.5 }, img, 10)!;
    expect(mpp).toBeCloseTo(0.02);
    // Rectángulo de 90 px de largo -> 1,80 m
    expect(suggestSize({ w: 90 / 5000, h: 10 / 3000 }, img, mpp)).toEqual({ width: 180, height: 160 });
    expect(calibrate({ x: 0.1, y: 0.1 }, { x: 0.1, y: 0.1 }, img, 3)).toBeNull();
  });
});

describe("importación de medidas", () => {
  it("lee CSV con punto y coma, comillas y tildes en el encabezado", () => {
    const rows = parseCsv('Edificio;Piso;Ambiente;Código;Ancho;Alto;Cantidad\n"Pabellón A";1;"Aula 101; norte";V1;1,80;150;3\n');
    expect(rows[1][2]).toBe("Aula 101; norte");
    const r = parseMeasurementRows(rows);
    expect(r.errors).toEqual([]);
    expect(r.rows[0]).toMatchObject({ building: "Pabellón A", room: "Aula 101; norte", width: 180, height: 150, quantity: 3, code: "V1" });
  });
  it("informa errores por fila y columnas faltantes", () => {
    const r = parseMeasurementRows([["ambiente", "ancho_cm", "alto_cm", "cantidad"], ["Aula 1", "abc", "150", "1"], ["", "100", "100", "0"], ["Aula 3", "120", "140", ""]]);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].quantity).toBe(1);
    expect(r.errors.map((e) => e.row)).toEqual([2, 3]);
    expect(parseMeasurementRows([["piso", "ancho"], ["1", "2"]]).errors[0].message).toMatch(/ambiente/);
  });
  it("convierte metros a centímetros", () => {
    expect(toCm("1.8")).toBe(180);
    expect(toCm("245")).toBe(245);
    expect(toCm("-1")).toBeNull();
  });
});

describe("exportaciones", () => {
  it("genera un PDF con tabla y un Excel válidos", async () => {
    const pdf = await buildPdf({
      brand: "Cota",
      title: "Proyecto",
      sections: [],
      tables: [{ heading: "Líneas", columns: [{ label: "Cód.", width: 40 }, { label: "Total", width: 60, align: "right" }], rows: [["V1", "S/ 300"]], totals: [["Total", "S/ 300"]] }],
    });
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");
    const xlsx = await buildXlsx([{ name: "Líneas", columns: [{ header: "Código", key: "code" }], rows: [{ code: "V1" }] }]);
    expect(xlsx[0]).toBe(0x50); // "PK": un .xlsx es un zip
  });
});
