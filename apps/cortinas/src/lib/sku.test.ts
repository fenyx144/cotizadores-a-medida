import { describe, expect, it } from "vitest";
import { suggestCode } from "@portafolio/core/autocode";
import { skuPart, skuPrefix } from "./admin-fields";

describe("SKU sugerido", () => {
  it("producto + valores fijos en orden de atributo", () => {
    const a = { prefix: { field: "modelId", map: { "2": skuPrefix("roller-blackout") } },
      parts: { field: "valueIds", map: { "6": { code: skuPart({ name: "Arena", code: "BK-03" }), order: 1 }, "13": { code: skuPart({ name: "Blanco", code: "RAL 9016" }), order: 2 } } } };
    expect(suggestCode(a, { modelId: 2, valueIds: "13,6" })).toBe("RB-ARENA-9016");
    expect(suggestCode(a, { modelId: 2, valueIds: "" })).toBe("RB");
    expect(skuPart({ name: "Día y noche", code: "" })).toBe("DIAYNOCHE");
  });
});
