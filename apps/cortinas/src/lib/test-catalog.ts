/** Catálogo mínimo para los tests del motor de reglas y de precios. */
import type { Attribute, AttributeValue, ConstraintRule, Material, ProductFamily, ProductModel, ProductVariant } from "@portafolio/core/db/schema";
import type { PricingRule } from "@portafolio/core/pricing";
import type { CatalogData } from "./line-price";

export const TELA = 1, PERFIL = 2, ACC = 3, LADO = 4, CENEFA = 6;
const val = (id: number, attributeId: number, name: string, extra: Partial<AttributeValue> = {}) =>
  ({ id, attributeId, name, code: "", hex: "", surcharge: 0, surchargeKind: "fijo", onlyFor: "", active: true, sortOrder: id, ...extra }) as AttributeValue;

export const models = [
  { id: 1, slug: "roller-screen", name: "Roller Screen 5%", type: "enrollable", material: "screen", familyId: 1, minWidth: 40, maxWidth: 300, minProjection: 40, maxProjection: 320, basePrice: 60, pricePerM2: 85 },
  { id: 2, slug: "roller-blackout", name: "Roller Blackout", type: "enrollable", material: "blackout", familyId: 1, minWidth: 40, maxWidth: 300, minProjection: 40, maxProjection: 320, basePrice: 60, pricePerM2: 90 },
  { id: 4, slug: "vertical", name: "Vertical", type: "vertical", material: "pvc", familyId: 4, minWidth: 60, maxWidth: 500, minProjection: 60, maxProjection: 350, basePrice: 60, pricePerM2: 70 },
] as ProductModel[];
export const attributes = [
  { id: TELA, name: "Tela", kind: "color", scope: "material", unit: "", sortOrder: 1 },
  { id: PERFIL, name: "Color del perfil", kind: "color", unit: "", sortOrder: 2 },
  { id: ACC, name: "Accionamiento", kind: "lista", unit: "", sortOrder: 3 },
  { id: LADO, name: "Lado del mando", kind: "lista", unit: "", sortOrder: 4 },
  { id: CENEFA, name: "Cenefa decorativa", kind: "sino", unit: "", sortOrder: 6 },
] as Attribute[];
export const values = [
  val(1, TELA, "Gris perla", { code: "SC5-04", hex: "#aaa" }),
  val(5, TELA, "Blanco", { code: "BK-01" }),
  val(6, TELA, "Arena", { code: "BK-03", surcharge: 6, surchargeKind: "por_m2" }),
  val(8, TELA, "Perla", { code: "VP-01" }),
  val(13, PERFIL, "Blanco", { code: "RAL 9016" }),
  val(15, PERFIL, "Negro mate", { code: "RAL 9005" }),
  val(16, ACC, "Cadena"), val(17, ACC, "Motor con mando", { surcharge: 380 }), val(18, ACC, "Motor + control centralizado", { surcharge: 520 }),
  val(19, LADO, "Izquierda"), val(20, LADO, "Derecha"),
  val(23, CENEFA, "Sí", { surcharge: 45 }),
];
export const families = [
  { id: 1, name: "Enrollable estándar", minWidth: 40, maxWidth: 300, minHeight: 40, maxHeight: 320,
    attributes: [{ attributeId: TELA, required: true, valueIds: [] }, { attributeId: PERFIL, required: true, valueIds: [] }, { attributeId: ACC, required: true, valueIds: [] }, { attributeId: LADO, required: false, valueIds: [] }, { attributeId: CENEFA, required: false, valueIds: [] }] },
  { id: 4, name: "Vertical", minWidth: 60, maxWidth: 500, minHeight: 60, maxHeight: 350,
    attributes: [{ attributeId: TELA, required: true, valueIds: [] }, { attributeId: ACC, required: true, valueIds: [16, 17] }] },
] as ProductFamily[];
const base = { familyId: null, modelId: null, ifOption: null, thenOption: null, minWidth: null, maxWidth: null, minHeight: null, maxHeight: null, active: true, conditions: [], targetAttributeId: null, targetValueIds: [], surcharge: 0, surchargeKind: "fijo", source: "", message: "" };
export const constraints = [
  { ...base, id: 1, name: "Arena/negro", kind: "bloquear", conditions: [{ attributeId: TELA, valueIds: [6] }], targetAttributeId: PERFIL, targetValueIds: [15], message: "Tela Arena no disponible con perfil negro RAL 9005." },
  { ...base, id: 2, name: "Blackout cadena", kind: "medidas", modelId: 2, conditions: [{ attributeId: ACC, valueIds: [16] }], maxWidth: 250, message: "Con cadena, hasta 2,50 m." },
  { ...base, id: 3, name: "Cenefa sin control", kind: "bloquear", conditions: [{ attributeId: CENEFA, valueIds: [23] }], targetAttributeId: ACC, targetValueIds: [18], message: "La cenefa no admite control centralizado." },
  { ...base, id: 4, name: "Perfil negro", kind: "recargo", conditions: [{ attributeId: PERFIL, valueIds: [15] }], surcharge: 18 },
] as ConstraintRule[];
export const rules: PricingRule[] = [
  { id: 2, name: "Instalación por cortina", kind: "fijo", amount: 25, drive: null, modelType: null, minArea: null, active: true },
];
export const variants = [
  { id: 1, modelId: 2, code: "RBK-0115", name: "Blanco · negro", valueIds: "5,15", priceAdjustment: 30, active: true, sortOrder: 1, attributes: "", fabricId: null, frameColorId: null },
  { id: 2, modelId: 2, code: "RBK-01", name: "Blanco", valueIds: "5", priceAdjustment: 0, active: true, sortOrder: 2, attributes: "", fabricId: null, frameColorId: null },
] as ProductVariant[];
// Cada material activa la tela con sus valores (Tela es "según material").
const mat = (id: number, slug: string, attributes: Material["attributes"]) => ({ id, slug, name: slug, description: "", sortOrder: id, active: true, attributes }) as Material;
export const materials = [
  mat(1, "screen", [{ attributeId: TELA, required: false, valueIds: [1] }]),
  mat(2, "blackout", [{ attributeId: TELA, required: false, valueIds: [5, 6] }]),
  mat(4, "pvc", [{ attributeId: TELA, required: false, valueIds: [8] }]),
];
export const catalog: CatalogData = { models, attributes, values, families, constraints, rules, variants, materials };
