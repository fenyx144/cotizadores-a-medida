import { describe, expect, it } from "vitest";
import { findZone, normalizePostalCode, quoteRequestSchema, toDateKey, validateVisitDate } from "../src/validation";
import { monthGrid } from "../src/calendar";
import { homography, project } from "../src/perspective";

const zones = [
  { name: "Amsterdam", postalFrom: 1000, postalTo: 1109, active: true },
  { name: "Utrecht", postalFrom: 3500, postalTo: 3585, active: true },
  { name: "Inactiva", postalFrom: 9000, postalTo: 9999, active: false },
];

describe("códigos postales y zonas", () => {
  it("normaliza el formato", () => {
    expect(normalizePostalCode("1012ab")).toBe("1012 AB");
    expect(normalizePostalCode(" 3511 cd ")).toBe("3511 CD");
  });
  it("encuentra la zona correcta", () => {
    expect(findZone("1012 AB", zones)?.name).toBe("Amsterdam");
    expect(findZone("3511CD", zones)?.name).toBe("Utrecht");
  });
  it("devuelve null fuera de zona, con zona inactiva o formato inválido", () => {
    expect(findZone("2000 AB", zones)).toBeNull();
    expect(findZone("9100 AB", zones)).toBeNull();
    expect(findZone("12345", zones)).toBeNull();
  });
});

describe("fecha de visita", () => {
  const today = new Date(2026, 9, 5); // lunes 5 oct 2026
  it("acepta un día laborable futuro", () => {
    expect(validateVisitDate("2026-10-07", today)).toBeNull();
  });
  it("rechaza hoy, domingos y fechas lejanas", () => {
    expect(validateVisitDate("2026-10-05", today)).toMatch(/mañana/);
    expect(validateVisitDate("2026-10-11", today)).toMatch(/domingos/);
    expect(validateVisitDate("2027-03-01", today)).toMatch(/tres meses/);
  });
});

describe("formulario de solicitud", () => {
  const future = new Date();
  future.setDate(future.getDate() + 3);
  if (future.getDay() === 0) future.setDate(future.getDate() + 1);
  const valid = {
    name: "Marieke de Vries",
    email: "marieke@example.nl",
    phone: "+31 6 1234 5678",
    postalCode: "1012 AB",
    address: "Prinsengracht 12",
    city: "Amsterdam",
    preferredDate: toDateKey(future),
    preferredSlot: "manana",
    message: "",
    configuration: { modelId: 1, width: 400, projection: 300, fabricId: 1, frameColorId: 1, drive: "motor" },
    consent: true,
  };
  it("acepta datos válidos", () => {
    expect(quoteRequestSchema.safeParse(valid).success).toBe(true);
  });
  it("marca email, teléfono, código postal y consentimiento", () => {
    const r = quoteRequestSchema.safeParse({ ...valid, email: "no", phone: "12", postalCode: "AB12", consent: false });
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["email", "phone", "postalCode", "consent"]));
  });
});

describe("utilidades", () => {
  it("el calendario empieza en lunes y cubre el mes completo", () => {
    const weeks = monthGrid(2026, 10); // octubre 2026 empieza en jueves
    expect(weeks[0][0].key).toBe("2026-09-28");
    expect(weeks[0][3]).toMatchObject({ day: 1, inMonth: true });
    expect(weeks.flat().filter((d) => d.inMonth)).toHaveLength(31);
  });
  it("la homografía lleva las esquinas a su destino", () => {
    const dst = [{ x: 10, y: 20 }, { x: 300, y: 40 }, { x: 280, y: 200 }, { x: 30, y: 180 }] as const;
    const H = homography(100, 50, [...dst] as never);
    const p = project(H, { x: 100, y: 50 });
    expect(p.x).toBeCloseTo(280);
    expect(p.y).toBeCloseTo(200);
  });
});
