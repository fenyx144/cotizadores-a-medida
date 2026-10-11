import { describe, expect, it } from "vitest";
import type { ConstraintRule, Fabric, FrameColor, ProductFamily, ProductModel } from "@portafolio/core/db/schema";
import type { PricingRule } from "@portafolio/core/pricing";
import { evaluate } from "./rules";
import { priceLine } from "./line-price";

const models = [
  { id: 2, slug: "roller-blackout", name: "Roller Blackout", type: "enrollable", material: "blackout", familyId: 1, minWidth: 40, maxWidth: 300, minProjection: 40, maxProjection: 320, basePrice: 60, pricePerM2: 90 },
  { id: 4, slug: "vertical", name: "Vertical", type: "vertical", material: "pvc", familyId: 4, minWidth: 60, maxWidth: 500, minProjection: 60, maxProjection: 350, basePrice: 60, pricePerM2: 70 },
] as ProductModel[];
const fabrics = [
  { id: 5, name: "Blanco", code: "BK-01", collection: "Blackout", types: "blackout", hex: "#eee", surchargePerM2: 0 },
  { id: 6, name: "Arena", code: "BK-03", collection: "Blackout", types: "blackout", hex: "#dcb", surchargePerM2: 0 },
  { id: 8, name: "Perla", code: "VP-01", collection: "PVC", types: "pvc", hex: "#fff", surchargePerM2: 0 },
] as Fabric[];
const frames = [{ id: 1, name: "Blanco", ral: "9016", surcharge: 0 }, { id: 3, name: "Negro mate", ral: "9005", surcharge: 0 }] as FrameColor[];
const families = [
  { id: 1, name: "Enrollable estándar", requiresFabric: true, requiresFrame: true, requiresDrive: true, minWidth: 40, maxWidth: 300, minHeight: 40, maxHeight: 320, allowedDrives: "", allowedFrameIds: "", allowedFabricIds: "" },
  { id: 4, name: "Vertical", requiresFabric: true, requiresFrame: false, requiresDrive: true, minWidth: 60, maxWidth: 500, minHeight: 60, maxHeight: 350, allowedDrives: "manual,motor", allowedFrameIds: "", allowedFabricIds: "" },
] as ProductFamily[];
const base = { familyId: null, modelId: null, ifOption: null, thenOption: null, minWidth: null, maxWidth: null, minHeight: null, maxHeight: null, active: true };
const constraints = [
  { ...base, id: 1, name: "Arena/negro", kind: "incompatibilidad", ifOption: "tela:6", thenOption: "perfil:3", message: "Tela Arena no disponible con perfil negro RAL 9005." },
  { ...base, id: 2, name: "Blackout cadena", kind: "dimension", modelId: 2, ifOption: "accionamiento:manual", maxWidth: 250, message: "Con cadena, hasta 2,50 m." },
] as ConstraintRule[];
const rules: PricingRule[] = [{ id: 9, name: "Perfil negro", kind: "fijo", amount: 18, drive: null, modelType: null, minArea: null, optionRef: "perfil:3", active: true }];
const c = { models, fabrics, frames, families, constraints, rules };

describe("motor de reglas", () => {
  it("bloquea el perfil negro con tela Arena (y Arena con perfil negro), con motivo", () => {
    const a = evaluate(c, { modelId: 2, fabricId: 6, frameColorId: 1, drive: "manual" });
    expect(a.frames.find((f) => f.value === 3)?.disabled).toMatch(/Arena/);
    const b = evaluate(c, { modelId: 2, fabricId: 5, frameColorId: 3, drive: "manual" });
    expect(b.fabrics.find((f) => f.value === 6)?.disabled).toMatch(/RAL 9005/);
    expect(evaluate(c, { modelId: 2, fabricId: 6, frameColorId: 3, drive: "manual" }).errors.frame).toMatch(/Arena/);
  });
  it("aplica límites de medidas condicionados por opción", () => {
    expect(evaluate(c, { modelId: 2, fabricId: 5, frameColorId: 1, drive: "manual", width: 280, height: 150 }).errors.width).toMatch(/2,50 m/);
    expect(evaluate(c, { modelId: 2, fabricId: 5, frameColorId: 1, drive: "motor", width: 280, height: 150 }).errors.width).toBeUndefined();
  });
  it("familia: opciones permitidas y parámetros no requeridos", () => {
    const v = evaluate(c, { modelId: 4, fabricId: 8, drive: "sensor", width: 200, height: 200 });
    expect(v.requires.frame).toBe(false);
    expect(v.drives.map((d) => d.value)).toEqual(["manual", "motor"]);
    expect(v.errors.drive).toBeTruthy();
    expect(v.errors.frame).toBeUndefined();
  });
  it("recargo condicionado a una opción", () => {
    const blanco = priceLine(c, { modelId: 2, fabricId: 5, frameColorId: 1, drive: "manual", width: 200, height: 200 })!;
    const negro = priceLine(c, { modelId: 2, fabricId: 5, frameColorId: 3, drive: "manual", width: 200, height: 200 })!;
    expect(negro.unitPrice - blanco.unitPrice).toBeGreaterThanOrEqual(10);
  });
});
