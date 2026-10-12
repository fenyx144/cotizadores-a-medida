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
