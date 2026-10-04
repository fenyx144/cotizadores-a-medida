import { describe, expect, it } from "vitest";
import type { Fabric, FrameColor, ProductModel } from "@portafolio/core/db/schema";
import type { PricingRule } from "@portafolio/core/pricing";
import { fabricsFor, priceLine, type CatalogData } from "./line-price";

const model = { id: 1, slug: "roller-screen", name: "Roller Screen 5%", type: "enrollable", material: "screen", minWidth: 40, maxWidth: 300, minProjection: 40, maxProjection: 320, basePrice: 60, pricePerM2: 85 } as ProductModel;
const fabrics = [
  { id: 1, name: "Gris perla", types: "screen,mixto", hex: "#aaa", surchargePerM2: 0 },
  { id: 2, name: "Blanco", types: "blackout", hex: "#eee", surchargePerM2: 6 },
  { id: 3, name: "Universal", types: "", hex: "#ccc", surchargePerM2: 0 },
] as Fabric[];
const frames = [{ id: 1, name: "Blanco", surcharge: 0 }] as FrameColor[];
const rules: PricingRule[] = [
  { id: 1, name: "Motor con mando", kind: "fijo", amount: 380, drive: "motor", modelType: null, minArea: null, active: true },
  { id: 2, name: "Instalación por cortina", kind: "fijo", amount: 25, drive: null, modelType: null, minArea: null, active: true },
];
const catalog: CatalogData = { models: [model], fabrics, frames, rules };

describe("precio de una línea", () => {
  it("filtra telas por tipo o material", () => {
    expect(fabricsFor(catalog, model).map((f) => f.id)).toEqual([1, 3]);
  });
  it("aula típica 1,90 × 1,60 m con cadena ≈ S/ 340", () => {
    const r = priceLine(catalog, { modelId: 1, fabricId: 1, frameColorId: 1, drive: "manual", width: 190, height: 160 })!;
    // 60 + 3,04 m² × 85 + 25 de instalación = 343,4 -> 340
    expect(r.unitPrice).toBe(340);
    expect(r.config).toMatchObject({ modelName: "Roller Screen 5%", fabricName: "Gris perla", drive: "manual" });
  });
  it("con motor suma la regla y usa una tela compatible si la elegida no lo es", () => {
    const r = priceLine(catalog, { modelId: 1, fabricId: 2, frameColorId: 1, drive: "motor", width: 190, height: 160 })!;
    expect(r.unitPrice).toBe(720);
    expect(r.config.fabricName).toBe("Gris perla");
  });
  it("devuelve null si el producto no existe", () => {
    expect(priceLine(catalog, { modelId: 99, fabricId: 1, frameColorId: 1, drive: "manual", width: 100, height: 100 })).toBeNull();
  });
});
