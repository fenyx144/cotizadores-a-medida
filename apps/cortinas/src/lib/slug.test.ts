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

describe("formulario de producto: atributos", () => {
  it("según la categoría; sin categoría (o borrada) todos", async () => {
    const { attrsByFamily } = await import("./admin-catalog");
    const attrs = [{ id: 1, name: "Mando", values: [{ id: 10, name: "Cadena" }] }, { id: 2, name: "Color de tela", values: [{ id: 20, name: "Arena" }] }];
    const map = attrsByFamily([{ id: 7, attributes: [{ attributeId: 2, valueIds: [], material: "screen" } as never] }, { id: 8, attributes: [] }], attrs);
    expect(map["7"].map((a) => a.id)).toEqual([2]);
    expect(map["7"][0].values.length).toBe(1);
    expect(map["8"].length).toBe(2);
    expect(map["*"].length).toBe(2);
    expect(map["999"]).toBeUndefined(); // el formulario usa "*" como respaldo
  });
});

describe("crear producto solo con campos visibles", () => {
  it("valida aunque los ocultos lleguen vacíos y normaliza Usos", async () => {
    const { resources } = await import("./admin-crud");
    const { productFields } = await import("./admin-fields");
    const fields = productFields([{ value: "1", label: "Cat" }], [{ value: "screen", label: "Screen" }]);
    const row: Record<string, unknown> = { name: "Persiana de aluminio 25 mm", image: "/x.jpg", familyId: "1", materials: "screen", uses: "Educacion, salud",
      tagline: "", description: "", gallery: [], specs: [{ label: "Lama", value: "25 mm" }], attributes: [], minWidth: 40, maxWidth: 240, minProjection: 40, maxProjection: 260, active: true };
    for (const f of fields) if (f.hidden && !(f.name in row)) row[f.name] = f.type === "number" ? "" : undefined;
    const r = resources.products.schema.safeParse(row);
    expect(r.error?.issues ?? []).toEqual([]);
    expect((r.data as { uses: string }).uses).toBe("educacion,salud");
    expect(fields.find((f) => f.name === "uses")!.type).toBe("multiselect");
  });
});
