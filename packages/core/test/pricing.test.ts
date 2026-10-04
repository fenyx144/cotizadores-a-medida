import { describe, expect, it } from "vitest";
import { areaM2, calculatePrice, clampToStep, formatMoney, validateDimensions, type PricingModel, type PricingRule } from "../src/pricing";

const model: PricingModel = { id: 1, name: "Brisa", type: "retractil", minWidth: 200, maxWidth: 600, minProjection: 150, maxProjection: 350, basePrice: 690, pricePerM2: 85 };
const rule = (r: Partial<PricingRule>): PricingRule => ({ id: 1, name: "Regla", kind: "fijo", amount: 0, drive: null, modelType: null, minArea: null, active: true, ...r });
const base = { modelId: 1, fabricId: 1, frameColorId: 1, drive: "manual" as const };

describe("medidas", () => {
  it("calcula m² con dos decimales", () => {
    expect(areaM2(400, 300)).toBe(12);
    expect(areaM2(355, 250)).toBe(8.88);
  });

  it("ajusta al paso de 10 cm y a los límites", () => {
    expect(clampToStep(347, 150, 350)).toBe(350);
    expect(clampToStep(90, 150, 350)).toBe(150);
    expect(clampToStep(999, 150, 350)).toBe(350);
  });

  it("rechaza medidas fuera de rango", () => {
    expect(validateDimensions(model, 700, 200)).toHaveLength(1);
    expect(validateDimensions(model, 400, 100)).toHaveLength(1);
    expect(validateDimensions(model, 400, 300)).toEqual([]);
  });

  it("no permite salida mayor que el ancho en toldos de brazos", () => {
    const errors = validateDimensions(model, 250, 300);
    expect(errors.some((e) => e.includes("brazos"))).toBe(true);
    // En un vertical sí se permite (la "salida" es la caída).
    expect(validateDimensions({ ...model, type: "vertical" }, 250, 300)).toEqual([]);
  });
});

describe("calculatePrice", () => {
  it("precio base = base + m² × precio/m², redondeado a decenas", () => {
    const r = calculatePrice({ ...base, width: 400, projection: 300 }, { model, rules: [] });
    // 690 + 12 × 85 = 1710
    expect(r.total).toBe(1710);
    expect(r.area).toBe(12);
  });

  it("suma recargos de tela (por m²) y de color (fijo)", () => {
    const r = calculatePrice(
      { ...base, width: 400, projection: 300 },
      { model, fabric: { id: 1, name: "Rayas", surchargePerM2: 10 }, frameColor: { id: 1, name: "Antracita", surcharge: 60 }, rules: [] },
    );
    expect(r.total).toBe(1710 + 120 + 60);
    expect(r.lines).toHaveLength(3);
  });

  it("aplica reglas solo si coincide el accionamiento", () => {
    const rules = [rule({ name: "Motor", amount: 390, drive: "motor" })];
    expect(calculatePrice({ ...base, width: 400, projection: 300 }, { model, rules }).total).toBe(1710);
    expect(calculatePrice({ ...base, drive: "motor", width: 400, projection: 300 }, { model, rules }).total).toBe(2100);
  });

  it("aplica reglas por tipo de modelo, por superficie mínima e ignora inactivas", () => {
    const rules = [
      rule({ id: 2, name: "Solo pérgolas", amount: 500, modelType: "pergola" }),
      rule({ id: 3, name: "Gran formato", kind: "porcentaje", amount: 10, minArea: 15 }),
      rule({ id: 4, name: "Inactiva", amount: 999, active: false }),
    ];
    expect(calculatePrice({ ...base, width: 400, projection: 300 }, { model, rules }).total).toBe(1710);
    // 600 × 300 = 18 m² -> 690 + 18×85 = 2220, +10 % = 2442 -> 2440
    expect(calculatePrice({ ...base, width: 600, projection: 300 }, { model, rules }).total).toBe(2440);
  });

  it("el porcentaje se calcula sobre el subtotal con reglas fijas incluidas", () => {
    const rules = [rule({ name: "Instalación", amount: 200 }), rule({ id: 2, name: "IVA demo", kind: "porcentaje", amount: 10 })];
    const r = calculatePrice({ ...base, width: 400, projection: 300 }, { model, rules });
    expect(r.total).toBe(Math.round(((1710 + 200) * 1.1) / 10) * 10);
  });
});

describe("formatMoney", () => {
  it("formatea soles con separador de miles", () => {
    expect(formatMoney(1000)).toBe("S/ 1,000");
    expect(formatMoney(399.6)).toBe("S/ 400");
    expect(formatMoney(12500)).toBe("S/ 12,500");
  });
});
