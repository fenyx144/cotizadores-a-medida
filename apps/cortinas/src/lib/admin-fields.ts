/** Campos de cada recurso del catálogo para el CrudManager (servidor y cliente). */
import { SHOW_SURCHARGES } from "./flags";
import type { AttrOption, CrudField } from "@portafolio/core/ui/CrudManager";
import { MATERIAL_LABELS, TYPE_LABELS } from "./content";

const UPLOAD = "/api/admin/fotos";

const opts = (o: Record<string, string>) => Object.entries(o).map(([value, label]) => ({ value, label }));

type Opt = { value: string; label: string };

/** Campos de producto; la familia se elige de las familias existentes. */
export const productFields = (families: Opt[], materials: Opt[] = opts(MATERIAL_LABELS), familyMaterials: Record<string, string[]> = {}, attrsBy?: CrudField["attrsBy"], materialLinks?: CrudField["materialLinks"]): CrudField[] => [
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "image", label: "Foto principal", type: "image", uploadUrl: UPLOAD, column: true },
  { name: "familyId", label: "Categoría", type: "select", nullable: true, options: families, column: true },
  { name: "slug", label: "Dirección web", type: "text", hidden: true },
  { name: "type", label: "Mecanismo (antiguo)", type: "select", options: opts(TYPE_LABELS), hidden: true },
  { name: "material", label: "Material principal (antiguo)", type: "select", options: materials, hidden: true },
  { name: "materials", label: "Materiales del producto", type: "multiselect", options: materials, filterBy: { field: "familyId", map: familyMaterials }, column: true },
  { name: "uses", label: "Usos", type: "text" },
  { name: "tagline", label: "Frase corta", type: "text" },
  { name: "description", label: "Descripción", type: "textarea" },
  { name: "gallery", label: "Galería", type: "gallery", uploadUrl: UPLOAD },
  { name: "specs", label: "Ficha técnica", type: "specs" },
  { name: "minWidth", label: "Ancho mínimo (cm)", type: "number" },
  { name: "maxWidth", label: "Ancho máximo (cm)", type: "number", column: true },
  { name: "minProjection", label: "Alto mínimo (cm)", type: "number" },
  { name: "maxProjection", label: "Alto máximo (cm)", type: "number", column: true },
  { name: "basePrice", label: "Precio base (S/)", type: "number", hidden: true },
  { name: "pricePerM2", label: "Precio por m² (S/)", type: "number", hidden: true },
  { name: "attributes", label: "Atributos y valores del producto", type: "attrs", attrOptions: [], attrsBy, materialLinks, noRequired: true },
  { name: "active", label: "Visible en la web", type: "boolean", column: true },
];
export const PRODUCT_FIELDS = productFields([]);

export const ATTRIBUTE_FIELDS: CrudField[] = [
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "kind", label: "Tipo", type: "select", options: [{ value: "lista", label: "Lista de opciones" }, { value: "numero", label: "Número" }, { value: "sino", label: "Sí / no" }], column: true },
  { name: "values", label: "Valores", type: "values", uploadUrl: UPLOAD },
  { name: "scope", label: "Aplica a", type: "select", options: [{ value: "generico", label: "Genérico" }, { value: "material", label: "Según material" }], column: true },
  { name: "unit", label: "Unidad", type: "text" },
];

export const valueFields = (attrs: Opt[]): CrudField[] => [
  { name: "attributeId", label: "Atributo", type: "select", options: attrs, column: true },
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "code", label: "Código", type: "text", column: true },
  { name: "hex", label: "Muestra de color", type: "color", nullable: true, column: true },
  { name: "image", label: "Imagen", type: "image", uploadUrl: UPLOAD, column: true },
  { hidden: !SHOW_SURCHARGES, name: "surcharge", label: "Recargo (S/)", type: "number", step: 0.01, column: true },
  { hidden: !SHOW_SURCHARGES, name: "surchargeKind", label: "Recargo por", type: "select", options: [{ value: "fijo", label: "Unidad" }, { value: "por_m2", label: "m²" }] },
  { name: "active", label: "Activo", type: "boolean", column: true },
];

export const ruleFields = (options: Opt[]): CrudField[] => RULE_FIELDS.map((f) => (f.name === "optionRef" ? { ...f, options } : f));

export const RULE_FIELDS: CrudField[] = [
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "kind", label: "Tipo de regla", type: "select", options: [{ value: "fijo", label: "Importe fijo (S/)" }, { value: "por_m2", label: "Importe por m² (S/)" }, { value: "porcentaje", label: "Porcentaje (%)" }], column: true },
  { name: "amount", label: "Importe", type: "number", step: 0.01, column: true },
  { name: "modelType", label: "Solo para mecanismo", type: "select", nullable: true, options: opts(TYPE_LABELS), column: true },
  { name: "minArea", label: "A partir de (m²)", type: "number", step: 0.1, nullable: true, column: true },
  { name: "optionRef", label: "Solo si se elige", type: "select", nullable: true, options: [], column: true },
  { name: "active", label: "Activa", type: "boolean", column: true },
];

export const familyFields = (attrOptions: AttrOption[], materials: Opt[] = [], materialLinks?: CrudField["materialLinks"]): CrudField[] => [
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "materials", label: "Materiales permitidos", type: "multiselect", options: materials, allLabel: "Todos", column: true },
  { name: "description", label: "Descripción", type: "textarea" },
  { name: "attributes", label: "Atributos resultantes", type: "attrs", attrOptions, materialLinks, noValues: true, column: true },
  { name: "minWidth", label: "Ancho mínimo por defecto (cm)", type: "number" },
  { name: "maxWidth", label: "Ancho máximo por defecto (cm)", type: "number" },
  { name: "minHeight", label: "Alto mínimo por defecto (cm)", type: "number" },
  { name: "maxHeight", label: "Alto máximo por defecto (cm)", type: "number" },
  { name: "anchoRango", label: "Ancho (cm)", type: "text", column: true, readOnly: true, rangeOf: ["minWidth", "maxWidth"] },
  { name: "altoRango", label: "Alto (cm)", type: "text", column: true, readOnly: true, rangeOf: ["minHeight", "maxHeight"] },
];


export const materialFields = (attrOptions: AttrOption[]): CrudField[] => [...MATERIAL_FIELDS,
  { name: "usedBy", label: "Categorías que lo usan", type: "text", column: true, readOnly: true },
  { name: "attributes", label: "Atributos de este material", type: "attrs", attrOptions, noRequired: true }];

export const MATERIAL_FIELDS: CrudField[] = [
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "slug", label: "Código", type: "text", hidden: true },
  { name: "description", label: "Descripción", type: "textarea", column: true },
  { name: "price", label: "Precio (S/)", type: "number", step: 0.01, column: true },
  { name: "priceUnit", label: "Unidad", type: "select", options: [{ value: "m2", label: "por m²" }, { value: "ml", label: "por metro lineal" }], column: true },
  { name: "active", label: "Visible", type: "boolean", column: true },
];

/** Prefijo de SKU desde el código del producto: roller-blackout → RB. */
export const skuPrefix = (slug: string) => slug.split("-").filter(Boolean).map((w) => w[0]).join("").toUpperCase();
/** Parte de SKU de un valor: número RAL si lo hay; si no, el nombre en mayúsculas sin tildes. */
export const skuPart = (v: { name: string; code: string }) => {
  const ral = v.code.match(/RAL\s*(\d+)/i);
  return ral ? ral[1] : v.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "").toUpperCase();
};

export const variantFields = (models: Opt[], values: Opt[], _materials: Opt[] = [], autoCode?: CrudField["autoCode"], combo?: CrudField["combo"]): CrudField[] => [
  { name: "modelId", label: "Producto", type: "select", options: models, column: true },
  { name: "code", label: "Código (SKU)", type: "text", column: true, readOnly: true, autoCode },
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "material", label: "Material (antiguo)", type: "select", nullable: true, options: [], hidden: true },
  { name: "valueIds", label: "Combinación", type: "combo", options: values, column: true, combo },
  { name: "attributes", label: "Otros datos", type: "text" },
  { name: "priceAdjustment", label: "Ajuste de precio (S/ por unidad)", type: "number", hidden: true },
  { name: "active", label: "Activa", type: "boolean", column: true },
];
