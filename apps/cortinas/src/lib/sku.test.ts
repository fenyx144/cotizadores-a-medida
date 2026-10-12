import { describe, expect, it } from "vitest";
import { suggestCode } from "@portafolio/core/autocode";
import { skuPart, skuPrefix } from "./admin-fields";

describe("SKU sugerido", () => {
  const a = { prefix: { field: "modelId", map: { "1": skuPrefix("roller-screen") } },
    parts: { field: "valueIds", map: {
      "6": { code: skuPart({ name: "Arena", code: "BK-03" }), order: 1, attr: 1 },
      "5": { code: skuPart({ name: "Blanco", code: "BK-01" }), order: 1, attr: 1 },
      "13": { code: skuPart({ name: "Blanco", code: "RAL 9016" }), order: 2, attr: 2 } } } };
  it("añade una parte por cada valor fijo al ir eligiendo (formulario: modelId número, valueIds texto)", () => {
    expect(suggestCode(a, { modelId: 1, valueIds: "" })).toBe("RS");
    expect(suggestCode(a, { modelId: "1", valueIds: "6" })).toBe("RS-ARENA");
    expect(suggestCode(a, { modelId: 1, valueIds: "6,13" })).toBe("RS-ARENA-9016");
    expect(suggestCode(a, { modelId: 1, valueIds: "13,6" })).toBe("RS-ARENA-9016");
  });
  it("un atributo acotado a varios valores no entra en el código", () => {
    expect(suggestCode(a, { modelId: 1, valueIds: "6,5,13" })).toBe("RS-9016");
    expect(skuPart({ name: "Día y noche", code: "" })).toBe("DIAYNOCHE");
  });
});
