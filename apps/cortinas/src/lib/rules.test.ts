import { describe, expect, it } from "vitest";
import type { ConstraintRule } from "@portafolio/core/db/schema";
import { MATERIAL_ATTR, attributeMaterial, cleanValues, variantFixed, evaluate, findConflicts, matchVariant, variantValues, parseAttributeCell, ruleSentence, withDefaults } from "./rules";
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
    // Los valores los acota el producto (la categoría solo dice qué atributos).
    const cp = { ...c, models: c.models.map((m) => (m.id === 4 ? { ...m, attributes: [{ attributeId: ACC, required: false, valueIds: [16, 17] }] } : m)) };
    const v = evaluate(cp, { modelId: 4, values: { [TELA]: 8, [ACC]: 18 }, width: 200, height: 200 });
    expect(f(v, PERFIL)).toBeUndefined();
    expect(f(v, ACC)!.choices.map((x) => x.value)).toEqual([16, 17]);
    expect(v.errors[`a${ACC}`]).toBeTruthy();
    expect(evaluate(cp, { modelId: 4, values: { [TELA]: 8 } }).errors[`a${ACC}`]).toMatch(/Elija/);
    // Sin acotar en el producto: todos los valores (lo que guardara la categoría ya no limita).
    expect(f(evaluate(c, { modelId: 4, values: {} }), ACC)!.choices.length).toBeGreaterThan(2);
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

  it("material ∩ categoría: atributos y valores", () => {
    const bambu = { id: 9, slug: "bambu", name: "Bambú", description: "", sortOrder: 9, active: true, price: 0, priceUnit: "m2", attributes: [{ attributeId: TELA, required: false, valueIds: [6] }, { attributeId: PERFIL, required: false, valueIds: [-1] }, { attributeId: ACC, required: false, valueIds: [-1] }, { attributeId: CENEFA, required: false, valueIds: [-1] }] };
    const cc = { ...c, materials: [...c.materials!, bambu], models: [...c.models, { ...c.models[1], id: 9, material: "bambu", materials: "bambu" }] };
    const ev = evaluate(cc, { modelId: 9, values: {} });
    expect(ev.fields.map((x) => x.attribute.name)).toEqual(["Tela", "Lado del mando"]);
    expect(f(ev, TELA)!.choices.map((x) => x.value)).toEqual([6]);
    // Material sin la tela activada: el atributo "según material" no aparece.
    const sin = { ...cc, materials: cc.materials.map((m) => (m.slug === "bambu" ? { ...m, attributes: [] } : m)) };
    expect(evaluate(sin, { modelId: 9, values: {} }).fields.some((x) => x.attribute.id === TELA)).toBe(false);
  });

  it("condiciones de material y de ancho/alto", () => {
    const r = { ...constraints[0], id: 13, name: "Aluminio ancho", conditions: [{ kind: "material", attributeId: 0, valueIds: [], materials: ["blackout"] }, { kind: "ancho", attributeId: 0, valueIds: [], op: "gt", value: 200 }], targetAttributeId: ACC, targetValueIds: [16], message: "" } as ConstraintRule;
    const cc = { ...c, constraints: [r] };
    const cadena = (modelId: number, width: number) => f(evaluate(cc, { modelId, values: {}, width }), ACC)!.choices.find((x) => x.value === 16)?.disabled;
    expect(cadena(2, 250)).toBe("No disponible si Material es blackout y Ancho mayor que 200 cm.");
    expect(cadena(2, 150)).toBeUndefined();
    expect(cadena(1, 250)).toBeUndefined();
    const lt = { ...r, conditions: [{ kind: "alto", attributeId: 0, valueIds: [], op: "lt", value: 100 }] } as ConstraintRule;
    expect(f(evaluate({ ...c, constraints: [lt] }, { modelId: 1, values: {}, height: 80 }), ACC)!.choices.find((x) => x.value === 16)?.disabled).toBeTruthy();
    expect(ruleSentence(cc, r)).toBe("En todos los productos, si Material es blackout y Ancho mayor que 200 cm: bloquear Accionamiento Cadena.");
  });

  it("cambiar un valor fijado por la variante la quita (configuración libre)", () => {
    const v = c.variants![0]; const fixed = variantValues(c, v);
    expect(matchVariant(c, { modelId: v.modelId, values: fixed })?.id).toBe(v.id);
    const [attr] = Object.keys(fixed).map(Number);
    const other = c.values.find((x) => x.attributeId === attr && x.id !== fixed[attr])!;
    expect(matchVariant(c, { modelId: v.modelId, values: { ...fixed, [attr]: other.id } })?.id).not.toBe(v.id);
  });

  it("cambiar el tipo reajusta el color por defecto (permitir solo no bloquea al revés)", () => {
    const allow = { ...constraints[0], id: 14, name: "Tipo", kind: "permitir", conditions: [{ attributeId: ACC, valueIds: [16] }], targetAttributeId: LADO, targetValueIds: [19], message: "Solo izquierda con cadena." } as ConstraintRule;
    const cc = { ...c, constraints: [allow] };
    expect(f(evaluate(cc, { modelId: 2, values: { [LADO]: 20 } }), ACC)!.choices.find((x) => x.value === 16)?.disabled).toBeUndefined();
    expect(withDefaults(cc, { modelId: 2, values: { [ACC]: 16, [LADO]: 20 } })[LADO]).toBe(19);
  });


  it("producto con varios materiales a la vez: suma los atributos de todos, agrupados por material", () => {
    const cc = { ...c, models: c.models.map((m) => (m.id === 1 ? { ...m, materials: "screen,tubo-aluminio" } : m)) };
    const ev = evaluate(cc, { modelId: 1, values: {} });
    expect(ev.fields.some((x) => x.attribute.id === MATERIAL_ATTR)).toBe(false);
    expect(f(ev, TELA)!.choices.map((x) => x.value)).toEqual([1]);
    expect(f(ev, PERFIL)!.choices.map((x) => x.value)).toEqual([13]);
    const m1 = cc.models.find((m) => m.id === 1)!;
    expect(attributeMaterial(cc, m1, TELA)?.slug).toBe("screen");
    expect(attributeMaterial(cc, m1, PERFIL)?.slug).toBe("tubo-aluminio");
    expect(attributeMaterial(cc, m1, ACC)).toBeNull();
    // Línea antigua con Material elegido: se ignora sin romper.
    expect(withDefaults(cc, { modelId: 1, values: { [MATERIAL_ATTR]: 2 } })[TELA]).toBe(1);
  });
});

describe("varios materiales a la vez: reglas y variantes", () => {
  const cc = { ...c, models: c.models.map((m) => (m.id === 1 ? { ...m, materials: "screen,tubo-aluminio" } : m)) };
  const regla = (over: Partial<ConstraintRule>) => ({ ...constraints[0], id: 99, active: true, ...over }) as ConstraintRule;
  const all = { ...cc, materials: cc.materials!.map((m) => (m.slug === "tubo-aluminio" ? { ...m, attributes: [{ attributeId: PERFIL, required: false, valueIds: [] }] } : m)) };
  it("la condición Material = X se cumple si el producto incluye ese material (también combinada con atributos)", () => {
    const r = regla({ name: "Tubo sin negro", conditions: [{ kind: "material", materials: ["tubo-aluminio"] } as never], targetAttributeId: PERFIL, targetValueIds: [15], message: "Con tubo de aluminio, perfil blanco." });
    expect(f(evaluate({ ...all, constraints: [r] }, { modelId: 1 }), PERFIL)!.choices.find((x) => x.value === 15)?.disabled).toBe("Con tubo de aluminio, perfil blanco.");
    expect(f(evaluate({ ...all, constraints: [r] }, { modelId: 2 }), PERFIL)!.choices.find((x) => x.value === 15)?.disabled).toBeUndefined();
    const r2 = regla({ conditions: [{ kind: "material", materials: ["screen"] } as never, { attributeId: TELA, valueIds: [1] }], targetAttributeId: PERFIL, targetValueIds: [15], message: "x" });
    expect(f(evaluate({ ...all, constraints: [r2] }, { modelId: 1, values: { [TELA]: 1 } }), PERFIL)!.choices.find((x) => x.value === 15)?.disabled).toBe("x");
    expect(findConflicts({ ...all, constraints: [r, r2] })).toEqual([]);
  });
  it("una variante fija valores de varios materiales y deja libre el resto", () => {
    const vv = { ...all, variants: [{ ...c.variants![0], id: 9, modelId: 1, code: "RS-ARENA-9016", valueIds: "1,13", material: "" }] };
    expect(matchVariant(vv, { modelId: 1, values: { [TELA]: 1, [PERFIL]: 13 } })?.code).toBe("RS-ARENA-9016");
    expect(matchVariant(vv, { modelId: 1, values: { [TELA]: 1 } })).toBeUndefined();
    const fixed = variantValues(vv, vv.variants[0]);
    expect(fixed[TELA]).toBe(1); expect(fixed[PERFIL]).toBe(13); expect(fixed[ACC]).toBeUndefined();
  });
});

describe("reglas por producto", () => {
  it("Si Producto = Roller Blackout y ancho > 250 → limitar alto (solo en ese producto)", () => {
    const r = { ...constraints[0], id: 77, active: true, kind: "medidas", modelId: 2, familyId: null, targetAttributeId: null, targetValueIds: [],
      conditions: [{ kind: "ancho", attributeId: 0, valueIds: [], op: "gt", value: 250 }], maxHeight: 200, message: "Más de 2,50 m de ancho: alto máx. 2,00 m." } as ConstraintRule;
    const cc = { ...c, constraints: [r] };
    expect(evaluate(cc, { modelId: 2, width: 260 }).limits.maxHeight).toBe(200);
    expect(evaluate(cc, { modelId: 2, width: 200 }).limits.maxHeight).toBe(320);
    expect(evaluate(cc, { modelId: 1, width: 260 }).limits.maxHeight).toBe(320);
    expect(evaluate(cc, { modelId: 2, width: 260, height: 250 }).errors.height).toBeTruthy();
    expect(ruleSentence(cc, r)).toMatch(/Roller Blackout/);
  });
});

describe("plantilla de pedido", () => {
  it("la importación lee la hoja Pedido aunque haya más hojas", async () => {
    const { buildXlsx } = await import("@portafolio/core/xlsx");
    const { readTable } = await import("@portafolio/core/import");
    const buf = await buildXlsx([
      { name: "Productos", columns: [{ header: "producto", key: "p" }], rows: [{ p: "x" }] },
      { name: "Pedido", columns: [{ header: "ubicacion", key: "u" }, { header: "producto", key: "p" }], rows: [{ u: "Aula 1", p: "Roller Screen 5%" }] },
    ]);
    expect(await readTable(buf, "plantilla.xlsx")).toEqual([["ubicacion", "producto"], ["Aula 1", "Roller Screen 5%"]]);
  });
});

describe("variantes que acotan valores", () => {
  // Variante de Roller Blackout: tela Blanco o Arena (el cliente elige) y perfil Blanco fijo.
  const v = { ...c.variants![0], id: 50, modelId: 2, code: "RB-9016", valueIds: "5,6,13", material: "" };
  const cc = { ...c, variants: [v] };
  it("en el asistente solo ofrece los valores de la variante y fija los de un valor", () => {
    const ev = evaluate(cc, { modelId: 2, values: { [TELA]: 5, [PERFIL]: 13 }, variantId: 50 });
    expect(f(ev, TELA)!.choices.map((x) => x.value)).toEqual([5, 6]);
    expect(f(ev, PERFIL)!.choices.map((x) => x.value)).toEqual([13]);
    expect(variantFixed(cc, v)).toEqual({ [PERFIL]: 13 });
    expect(variantValues(cc, v, { [TELA]: 6 })).toEqual({ [TELA]: 6, [PERFIL]: 13 });
    expect(evaluate(cc, { modelId: 2, values: { [TELA]: 5, [PERFIL]: 15 }, variantId: 50 }).errors[`a${PERFIL}`]).toBeTruthy();
  });
  it("la tabla y el servidor reconocen la variante con cualquiera de sus valores", () => {
    expect(matchVariant(cc, { modelId: 2, values: { [TELA]: 6, [PERFIL]: 13 } })?.code).toBe("RB-9016");
    expect(matchVariant(cc, { modelId: 2, values: { [TELA]: 5, [PERFIL]: 13 } })?.code).toBe("RB-9016");
    expect(matchVariant(cc, { modelId: 2, values: { [TELA]: 6, [PERFIL]: 15 } })).toBeUndefined();
  });
});

describe("el producto acota la categoría", () => {
  it("solo ofrece los valores del producto y puede quitar un atributo", () => {
    const cc = { ...c, models: c.models.map((m) => (m.id === 2 ? { ...m, attributes: [{ attributeId: PERFIL, required: false, valueIds: [13] }, { attributeId: LADO, required: false, valueIds: [-1] }] } : m)) };
    const ev = evaluate(cc, { modelId: 2 });
    expect(f(ev, PERFIL)!.choices.map((x) => x.value)).toEqual([13]);
    expect(f(ev, LADO)).toBeUndefined();
    expect(evaluate(cc, { modelId: 2, values: { [PERFIL]: 15 } }).errors[`a${PERFIL}`]).toBeTruthy();
    expect(withDefaults(cc, { modelId: 2 })[PERFIL]).toBe(13);
    expect(f(evaluate(cc, { modelId: 1 }), PERFIL)!.choices.length).toBeGreaterThan(1);
  });
});

describe("precio por materiales", () => {
  it("suma tela por m² y tubo por metro lineal", async () => {
    const { priceLine, materialPricing } = await import("./line-price");
    const cc = { ...c, rules: [], constraints: [], materials: c.materials!.map((m) => (m.slug === "screen" ? { ...m, price: 100, priceUnit: "m2" } : m.slug === "tubo-aluminio" ? { ...m, price: 20, priceUnit: "ml" } : m)),
      models: c.models.map((m) => (m.id === 1 ? { ...m, materials: "screen,tubo-aluminio" } : m)) };
    const m1 = cc.models.find((m) => m.id === 1)!;
    expect(materialPricing(cc, m1, 200)).toEqual({ basePrice: 40, pricePerM2: 100 });
    // 2 m × 1,5 m: 3 m² × 100 + 2 m × 20 = 340
    expect(priceLine(cc, { modelId: 1, values: {}, width: 200, height: 150 })!.unitPrice).toBe(340);
    // Sin precios de material: usa los del producto (compatibilidad).
    expect(materialPricing(c, c.models[0], 200)).toEqual({ basePrice: c.models[0].basePrice, pricePerM2: c.models[0].pricePerM2 });
  });
});

describe("ayúdame a elegir sin categoría", () => {
  it("incluye productos de todas las categorías", async () => {
    const { guideItems } = await import("./guide");
    const fams = new Set(guideItems(c, null).map((x) => x.model.familyId));
    expect(fams.size).toBeGreaterThan(1);
  });
});

describe("asistente tras la guía", () => {
  it("no vuelve a preguntar lo respondido ni lo fijado por la variante", async () => {
    const { stepsToAsk, guideItems, answersFor } = await import("./guide");
    const ev = evaluate(c, { modelId: 1, values: {} });
    const ids = ev.fields.map((f) => f.attribute.id);
    const pre = answersFor(guideItems(c, c.models[0].familyId), 1, { [ids[0]]: ev.fields[0].choices[0]?.value as number });
    const asked = stepsToAsk(ev.fields, [ids[1]], Object.keys(pre).map(Number)).map((f) => f.attribute.id);
    expect(asked).not.toContain(ids[1]);
    if (Object.keys(pre).length) expect(asked).not.toContain(ids[0]);
    expect(asked.length).toBeLessThan(ids.length);
  });
});

describe("permisos por (material, atributo) en el producto", () => {
  it("cada material acota por separado; el producto une sus materiales", async () => {
    const { productAttribute } = await import("./rules");
    const m = { ...c.models[0], materials: "screen,tubo-aluminio", attributes: [
      { attributeId: 99, required: false, valueIds: [1, 2], material: "screen" },
      { attributeId: 99, required: false, valueIds: [3], material: "tubo-aluminio" },
      { attributeId: 98, required: false, valueIds: [-1], material: "screen" },
    ] };
    expect(productAttribute(m, 99)!.valueIds.sort()).toEqual([1, 2, 3]);
    expect(productAttribute({ ...m, materials: "screen" }, 99)!.valueIds).toEqual([1, 2]);
    expect(productAttribute(m, 98)!.valueIds).toEqual([-1]);
    expect(productAttribute(m, 97)).toBeUndefined();
  });
  it("categoría por material: solo atributos y obligatoriedad", async () => {
    const { effectiveFamilyConf } = await import("./rules");
    const conf = effectiveFamilyConf([{ attributeId: 5, required: true, valueIds: [1], material: "screen" }, { attributeId: 5, required: false, valueIds: [2], material: "blackout" }, { attributeId: 6, required: false, valueIds: [3] }], ["blackout"]);
    expect(conf).toEqual([{ attributeId: 5, required: false, valueIds: [] }, { attributeId: 6, required: false, valueIds: [] }]);
  });
});
