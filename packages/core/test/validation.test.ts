import { describe, expect, it } from "vitest";
import { findZone, quoteRequestSchema, RUC_REGEX, toDateKey, validateVisitDate } from "../src/validation";
import { monthGrid } from "../src/calendar";
import { homography, project } from "../src/perspective";

const zones = [
  { name: "Yanahuara", active: true },
  { name: "José Luis Bustamante y Rivero", active: true },
  { name: "Socabaya", active: false },
];

describe("zonas de servicio (distritos)", () => {
  it("encuentra el distrito sin importar tildes ni mayúsculas", () => {
    expect(findZone("yanahuara", zones)?.name).toBe("Yanahuara");
    expect(findZone("Jose Luis Bustamante y Rivero", zones)?.name).toBe("José Luis Bustamante y Rivero");
  });
  it("devuelve null fuera de zona, con zona inactiva o vacío", () => {
    expect(findZone("Mollendo", zones)).toBeNull();
    expect(findZone("Socabaya", zones)).toBeNull();
    expect(findZone("  ", zones)).toBeNull();
  });
  it("valida el RUC peruano", () => {
    expect(RUC_REGEX.test("20123456789")).toBe(true);
    expect(RUC_REGEX.test("12345678901")).toBe(false);
    expect(RUC_REGEX.test("2012345678")).toBe(false);
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
    name: "Lucía Paredes",
    email: "lucia@example.pe",
    phone: "+51 959 123 456",
    district: "Yanahuara",
    address: "Av. Ejército 101",
    preferredDate: toDateKey(future),
    preferredSlot: "manana",
    message: "",
    configuration: { modelId: 1, width: 400, projection: 300, fabricId: 1, frameColorId: 1, drive: "motor" },
    consent: true,
  };
  it("acepta datos válidos", () => {
    expect(quoteRequestSchema.safeParse(valid).success).toBe(true);
  });
  it("marca email, teléfono, distrito y consentimiento", () => {
    const r = quoteRequestSchema.safeParse({ ...valid, email: "no", phone: "12", district: "", consent: false });
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["email", "phone", "district", "consent"]));
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
