import { describe, expect, it } from "vitest";
import { priceLine } from "./line-price";
import { ACC, PERFIL, TELA, catalog } from "./test-catalog";

describe("precio de una línea", () => {
  it("aula típica 1,90 × 1,60 m con cadena ≈ S/ 340", () => {
    const r = priceLine(catalog, { modelId: 1, values: { [TELA]: 1, [PERFIL]: 13, [ACC]: 16 }, width: 190, height: 160 })!;
    // 60 + 3,04 m² × 85 + 25 de instalación = 343,4 -> 340
    expect(r.unitPrice).toBe(340);
    expect(r.config).toMatchObject({ modelName: "Roller Screen 5%" });
    expect(r.config.options[0]).toMatchObject({ attribute: "Tela", value: "Gris perla", code: "SC5-04" });
  });
  it("con motor suma el recargo del valor", () => {
    expect(priceLine(catalog, { modelId: 1, values: { [TELA]: 1, [PERFIL]: 13, [ACC]: 17 }, width: 190, height: 160 })!.unitPrice).toBe(720);
  });
  it("devuelve null si el producto no existe", () => {
    expect(priceLine(catalog, { modelId: 99, values: {}, width: 100, height: 100 })).toBeNull();
  });
});
