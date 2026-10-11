/** Campos de cada recurso del catálogo para el CrudManager (servidor y cliente). */
import { SHOW_SURCHARGES } from "@/lib/flags";
import type { AttrOption, CrudField } from "@portafolio/core/ui/CrudManager";
import { MATERIAL_LABELS, TYPE_LABELS } from "./content";

const UPLOAD = "/api/admin/fotos";

const opts = (o: Record<string, string>) => Object.entries(o).map(([value, label]) => ({ value, label }));

type Opt = { value: string; label: string };

/** Campos de producto; la familia se elige de las familias existentes. */
export const productFields = (families: Opt[], materials: Opt[] = opts(MATERIAL_LABELS), familyMaterials: Record<string, string[]> = {}): CrudField[] => [
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "image", label: "Foto principal", type: "image", uploadUrl: UPLOAD, column: true },
  { name: "familyId", label: "Categoría", type: "select", nullable: true, options: families, column: true },
  { name: "slug", label: "Dirección web", type: "text" },
  { name: "type", label: "Mecanismo", type: "select", options: opts(TYPE_LABELS), column: true, hint: SHOW_SURCHARGES ? "Define el dibujo de la vista previa y los recargos generales por mecanismo." : "Define el dibujo de la vista previa." },
  { name: "material", label: "Material principal", type: "select", options: materials, column: true, filterBy: { field: "familyId", map: familyMaterials }, hint: "El que se propone por defecto." },
  { name: "materials", label: "Materiales disponibles", type: "multiselect", options: materials, allLabel: "Todos los de la categoría", filterBy: { field: "familyId", map: familyMaterials }, column: true, hint: "Con varios, el cliente elige primero el material." },
  { name: "uses", label: "Usos", type: "text", hint: "Separados por comas: educacion,oficinas,salud" },
  { name: "tagline", label: "Frase corta", type: "text" },
  { name: "description", label: "Descripción", type: "textarea" },
  { name: "gallery", label: "Galería", type: "gallery", uploadUrl: UPLOAD, hint: "Hasta 6 fotos. Use las flechas para ordenarlas." },
  { name: "specs", label: "Ficha técnica", type: "specs" },
  { name: "minWidth", label: "Ancho mínimo (cm)", type: "number" },
  { name: "maxWidth", label: "Ancho máximo (cm)", type: "number", column: true },
  { name: "minProjection", label: "Alto mínimo (cm)", type: "number" },
  { name: "maxProjection", label: "Alto máximo (cm)", type: "number", column: true },
  { name: "basePrice", label: "Precio base (S/)", type: "number", column: true },
  { name: "pricePerM2", label: "Precio por m² (S/)", type: "number", column: true },
  { name: "sortOrder", label: "Orden", type: "number" },
  { name: "active", label: "Visible en la web", type: "boolean", column: true },
];
export const PRODUCT_FIELDS = productFields([]);

export const ATTRIBUTE_FIELDS: CrudField[] = [
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "kind", label: "Tipo", type: "select", options: [{ value: "lista", label: "Lista de opciones" }, { value: "numero", label: "Número" }, { value: "sino", label: "Sí / no" }], column: true },
  { name: "scope", label: "Aplica a", type: "select", options: [{ value: "generico", label: "Genérico (todos los materiales)" }, { value: "material", label: "Según material" }], column: true, hint: "Según material: solo donde el material lo activa." },
  { name: "unit", label: "Unidad", type: "text", hint: "Solo para números. Ej.: cm" },
  { name: "sortOrder", label: "Orden en el configurador", type: "number", column: true },
];

export const valueFields = (attrs: Opt[]): CrudField[] => [
  { name: "attributeId", label: "Atributo", type: "select", options: attrs, column: true },
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "code", label: "Código", type: "text", column: true },
  { name: "hex", label: "Muestra de color", type: "color", nullable: true, column: true, hint: "Opcional." },
  { name: "image", label: "Imagen", type: "image", uploadUrl: UPLOAD, column: true, hint: "Miniatura opcional." },
  { hidden: !SHOW_SURCHARGES, name: "surcharge", label: "Recargo (S/)", type: "number", step: 0.01, column: true },
  { hidden: !SHOW_SURCHARGES, name: "surchargeKind", label: "Recargo por", type: "select", options: [{ value: "fijo", label: "Unidad" }, { value: "por_m2", label: "m²" }] },
  { name: "sortOrder", label: "Orden", type: "number" },
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
  { name: "attributes", label: "Atributos resultantes", type: "attrs", attrOptions, materialLinks, column: true, hint: "Genéricos y los que activan los materiales elegidos." },
  { name: "minWidth", label: "Ancho mínimo por defecto (cm)", type: "number" },
  { name: "maxWidth", label: "Ancho máximo por defecto (cm)", type: "number", column: true },
  { name: "minHeight", label: "Alto mínimo por defecto (cm)", type: "number" },
  { name: "maxHeight", label: "Alto máximo por defecto (cm)", type: "number", column: true },
  { name: "sortOrder", label: "Orden", type: "number" },
];


export const materialFields = (attrOptions: AttrOption[]): CrudField[] => [...MATERIAL_FIELDS,
  { name: "usedBy", label: "Usado en", type: "text", column: true, readOnly: true },
  { name: "attributes", label: "Atributos de este material", type: "attrs", attrOptions, noRequired: true, hint: "Marque los que aplican y sus valores." }];

export const MATERIAL_FIELDS: CrudField[] = [
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "slug", label: "Código", type: "text", column: true, hint: "Minúsculas, sin espacios. Ej.: blackout" },
  { name: "description", label: "Descripción", type: "textarea", column: true },
  { name: "sortOrder", label: "Orden", type: "number" },
  { name: "active", label: "Visible", type: "boolean", column: true },
];

export const variantFields = (models: Opt[], values: Opt[], materials: Opt[] = []): CrudField[] => [
  { name: "modelId", label: "Producto", type: "select", options: models, column: true },
  { name: "code", label: "Código (SKU)", type: "text", column: true },
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "material", label: "Material", type: "select", nullable: true, options: materials, column: true, hint: "Vacío = cualquiera." },
  { name: "valueIds", label: "Combinación", type: "multiselect", options: values, column: true, hint: "Valores que fija esta variante." },
  { name: "attributes", label: "Otros datos", type: "text", hint: "Ej.: cofre 80 mm" },
  { name: "priceAdjustment", label: "Ajuste de precio (S/ por unidad)", type: "number", column: true },
  { name: "sortOrder", label: "Orden", type: "number" },
  { name: "active", label: "Activa", type: "boolean", column: true },
];
