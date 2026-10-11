import { describe, expect, it } from "vitest";
import { drawingType, modelDrawing } from "./drawing";

const c = {
  attributes: [{ id: 8, name: "Accionamiento" }],
  values: [{ id: 30, attributeId: 8, code: "enrollable" }, { id: 31, attributeId: 8, code: "vertical" }],
  families: [{ id: 1, attributes: [{ attributeId: 8, valueIds: [31] }] }, { id: 2, attributes: [{ attributeId: 8, valueIds: [] }] }],
};

describe("dibujo por Accionamiento", () => {
  it("usa el valor elegido", () => expect(drawingType(c, { 8: 31 })).toBe("vertical"));
  it("sin elección: usa el respaldo y si no, enrollable", () => {
    expect(drawingType(c, {}, "veneciana")).toBe("veneciana");
    expect(drawingType(c, null)).toBe("enrollable");
  });
  it("producto: único valor permitido por su categoría", () => {
    expect(modelDrawing(c, { familyId: 1, type: "dual" })).toBe("vertical");
    expect(modelDrawing(c, { familyId: 2, type: "dual" })).toBe("dual");
  });
});
