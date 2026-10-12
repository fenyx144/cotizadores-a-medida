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

describe("crear categoría con el payload exacto del formulario", () => {
  it("visibles + ocultos tal como los envía el formulario", async () => {
    const { resources } = await import("./admin-crud");
    const { familyFields } = await import("./admin-fields");
    const fields = familyFields([{ id: 1, name: "Mando", values: [] }, { id: 2, name: "Tipo de tela", values: [] }], [{ value: "mixto", label: "Tela día y noche" }, { value: "tubo-aluminio", label: "Tubo" }],
      { field: "materials", scoped: [2], materials: [{ slug: "mixto", name: "Tela día y noche", attrs: [{ attributeId: 2, valueIds: [] }] }] });
    // Igual que emptyRow + toPayload del CrudManager.
    const row: Record<string, unknown> = {};
    for (const f of fields) row[f.name] = f.type === "attrs" ? [] : f.type === "multiselect" ? "" : f.type === "number" ? (f.nullable ? null : 0) : "";
    Object.assign(row, { name: "Doble roller", materials: "mixto,tubo-aluminio",
      attributes: [{ attributeId: 1, required: true, valueIds: [] }, { attributeId: 2, required: true, valueIds: [], material: "mixto" }] });
    const r = resources.families.schema.safeParse(row);
    expect(r.error?.issues ?? []).toEqual([]);
    // Entradas antiguas (sin "required", material null) y "Todos" desmarcado no rompen.
    const old = resources.families.schema.safeParse({ ...row, materials: "!", attributes: [{ attributeId: 1, valueIds: [], material: null }] });
    expect(old.error?.issues ?? []).toEqual([]);
    expect((old.data as { attributes: unknown[] }).attributes).toEqual([{ attributeId: 1, required: false, valueIds: [] }]);
    // Edición (parcial).
    const schema = resources.families.schema as unknown as { partial(): { safeParse(v: unknown): { success: boolean } } };
    expect(schema.partial().safeParse({ ...row, id: 3, requiresFabric: true, allowedDrives: "" }).success).toBe(true);
  });
});
