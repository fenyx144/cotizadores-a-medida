import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
describe("slug automático", () => {
  it("único a partir del nombre", async () => {
    const { uniqueSlug } = await import("./admin-crud");
    const { schema } = await import("./db");
    const db = { select: () => ({ from: async () => [{ s: "roller-blackout" }, { s: "roller-blackout-2" }] }) };
    expect(await uniqueSlug(db as never, schema.productModels, "Roller Blackout")).toBe("roller-blackout-3");
    expect(await uniqueSlug(db as never, schema.productModels, "Persiana de aluminio 25 mm")).toBe("persiana-de-aluminio-25-mm");
  });
});

describe("guardar categoría", () => {
  it("solo materiales, atributos y obligatorio (sin medidas ni valores)", async () => {
    const { resources } = await import("./admin-crud");
    const payload = { name: "Doble roller", description: "", materials: "mixto,tubo-aluminio", sortOrder: null,
      attributes: [{ attributeId: 1, required: true, valueIds: [] }, { attributeId: 2, required: false, valueIds: [], material: "mixto" }],
      minWidth: 0, maxWidth: 0, minHeight: 0, maxHeight: 0 };
    const r = resources.families.schema.safeParse(payload);
    expect(r.success).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.minWidth).toBeUndefined();
    expect(resources.families.schema.safeParse({ name: "Sin medidas", description: "", materials: "", attributes: [] }).success).toBe(true);
  });
});
