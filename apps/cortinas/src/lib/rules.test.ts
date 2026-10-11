import { describe, expect, it } from "vitest";
import type { ConstraintRule } from "@portafolio/core/db/schema";
import { cleanValues, evaluate, findConflicts, matchVariant, parseAttributeCell, ruleSentence, withDefaults } from "./rules";
import { priceLine } from "./line-price";
import { ACC, CENEFA, LADO, PERFIL, TELA, attributes, catalog as c, constraints } from "./test-catalog";

const f = (ev: ReturnType<typeof evaluate>, id: number) => ev.fields.find((x) => x.attribute.id === id);

describe("motor de reglas (atributos genéricos)", () => {
  it("muestra los atributos de la categoría, en orden, con valores filtrados por material", () => {
    const ev = evaluate(c, { modelId: 2 });
    expect(ev.fields.map((x) => x.attribute.name)).toEqual(["Tela", "Color del perfil", "Accionamiento", "Lado del mando", "Cenefa decorativa"]);
    expect(f(ev, TELA)!.choices.map((x) => x.label)).toEqual(["Blanco (BK-01)", "Arena (BK-03)"]);
    expect(f(ev, LADO)!.required).toBe(false);
  });
  it("incompatibilidad A↔B entre valores cualesquiera, con motivo", () => {
    const a = evaluate(c, { modelId: 2, values: { [TELA]: 6, [PERFIL]: 13, [ACC]: 16 } });
    expect(f(a, PERFIL)!.choices.find((x) => x.value === 15)?.disabled).toMatch(/Arena/);
    const b = evaluate(c, { modelId: 2, values: { [TELA]: 5, [PERFIL]: 15, [ACC]: 16 } });
    expect(f(b, TELA)!.choices.find((x) => x.value === 6)?.disabled).toMatch(/RAL 9005/);
    expect(evaluate(c, { modelId: 2, values: { [TELA]: 6, [PERFIL]: 15, [ACC]: 16 } }).errors[`a${PERFIL}`]).toMatch(/Arena/);
    // sí/no también participa en reglas
    expect(f(evaluate(c, { modelId: 2, values: { [CENEFA]: true } }), ACC)!.choices.find((x) => x.value === 18)?.disabled).toMatch(/cenefa/);
  });
  it("límites de medidas condicionados a un valor", () => {
    expect(evaluate(c, { modelId: 2, values: { [TELA]: 5, [PERFIL]: 13, [ACC]: 16 }, width: 280, height: 150 }).errors.width).toMatch(/2,50 m/);
    expect(evaluate(c, { modelId: 2, values: { [TELA]: 5, [PERFIL]: 13, [ACC]: 17 }, width: 280, height: 150 }).errors.width).toBeUndefined();
  });
  it("categoría sin perfil y con valores permitidos", () => {
    const v = evaluate(c, { modelId: 4, values: { [TELA]: 8, [ACC]: 18 }, width: 200, height: 200 });
    expect(f(v, PERFIL)).toBeUndefined();
    expect(f(v, ACC)!.choices.map((x) => x.value)).toEqual([16, 17]);
    expect(v.errors[`a${ACC}`]).toBeTruthy();
    expect(evaluate(c, { modelId: 4, values: { [TELA]: 8 } }).errors[`a${ACC}`]).toMatch(/Elija/);
  });
  it("completa valores por defecto y descarta atributos ajenos", () => {
    const v = withDefaults(c, { modelId: 4, values: { [PERFIL]: 13 } });
    expect(v).toEqual({ [TELA]: 8, [ACC]: 16 });
    expect(cleanValues(c, 4, { [PERFIL]: 13, [TELA]: 8 })).toEqual({ [TELA]: 8 });
  });
  it("recargos por valor (fijo y por m²) y reglas de precio por valor", () => {
    const sel = (extra: object) => ({ modelId: 2, values: { [TELA]: 5, [PERFIL]: 13, [ACC]: 16, ...extra }, width: 200, height: 200 });
    const baseP = priceLine(c, sel({}))!.unitPrice;
    expect(priceLine(c, sel({ [ACC]: 17 }))!.unitPrice - baseP).toBe(380);
    expect(priceLine(c, sel({ [CENEFA]: true }))!.unitPrice - baseP).toBeGreaterThanOrEqual(40);
    expect(priceLine(c, sel({ [TELA]: 6 }))!.unitPrice - baseP).toBeGreaterThanOrEqual(20); // 6 × 4 m²
    expect(priceLine(c, sel({ [PERFIL]: 15 }))!.unitPrice - baseP).toBeGreaterThanOrEqual(10);
  });
  it("variante: la más específica y su ajuste de precio", () => {
    expect(matchVariant(c, { modelId: 2, values: { [TELA]: 5, [PERFIL]: 15 } })?.code).toBe("RBK-0115");
    expect(matchVariant(c, { modelId: 2, values: { [TELA]: 5, [PERFIL]: 13 } })?.code).toBe("RBK-01");
    const r = priceLine(c, { modelId: 2, values: { [TELA]: 5, [PERFIL]: 15, [ACC]: 16 }, width: 200, height: 200 })!;
    expect(r.config.variantCode).toBe("RBK-0115");
    expect(r.config.options.map((o) => o.value)).toEqual(["Blanco", "Negro mate", "Cadena"]);
  });
  it("interpreta celdas pegadas de Excel", () => {
    const [tela, perfil, acc, , cenefa] = attributes;
    expect(parseAttributeCell(c, tela, "bk-03", c.models[1])).toBe(6);
    expect(parseAttributeCell(c, perfil, "9005")).toBe(15);
    expect(parseAttributeCell(c, acc, "Motor")).toBe(17);
    expect(parseAttributeCell(c, cenefa, "sí")).toBe(true);
    expect(parseAttributeCell(c, tela, "Terciopelo", c.models[1])).toBeUndefined();
  });

  it("varias condiciones con Y y 'es uno de'", () => {
    const r = { ...constraints[0], id: 10, name: "Combo", conditions: [{ attributeId: TELA, valueIds: [5, 6] }, { attributeId: ACC, valueIds: [17] }], targetAttributeId: LADO, targetValueIds: [20], message: "Solo izquierda." } as ConstraintRule;
    const cc = { ...c, constraints: [r] };
    expect(f(evaluate(cc, { modelId: 2, values: { [TELA]: 5, [ACC]: 17 } }), LADO)!.choices.find((x) => x.value === 20)?.disabled).toBe("Solo izquierda.");
    expect(f(evaluate(cc, { modelId: 2, values: { [TELA]: 5, [ACC]: 16 } }), LADO)!.choices.find((x) => x.value === 20)?.disabled).toBeUndefined();
    expect(f(evaluate(cc, { modelId: 2, values: { [TELA]: 5, [ACC]: 17 } }), LADO)!.choices.find((x) => x.value === 20)?.rule).toBe("Combo");
    expect(ruleSentence(cc, r)).toBe("En todos los productos, si Tela es uno de Blanco o Arena y Accionamiento es Motor con mando: bloquear Lado del mando Derecha.");
  });
  it("permitir solo valores y aviso de conflicto", () => {
    const allow = { ...constraints[0], id: 11, name: "Solo cadena con Arena", kind: "permitir", conditions: [{ attributeId: TELA, valueIds: [6] }], targetAttributeId: ACC, targetValueIds: [16], message: "" } as ConstraintRule;
    const ev = evaluate({ ...c, constraints: [allow] }, { modelId: 2, values: { [TELA]: 6 } });
    expect(f(ev, ACC)!.choices.map((x) => !x.disabled)).toEqual([true, false, false]);
    expect(findConflicts({ ...c, constraints: [allow] })).toEqual([]);
    const none = { ...allow, id: 12, targetValueIds: [] } as ConstraintRule;
    expect(findConflicts({ ...c, constraints: [none] })[0]).toMatchObject({ model: "Roller Blackout", when: "Tela = Arena", attribute: "Accionamiento" });
  });
});
