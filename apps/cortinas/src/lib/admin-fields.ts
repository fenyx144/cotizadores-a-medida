/** Campos de cada recurso del catálogo para el CrudManager (servidor y cliente). */
import type { AttrOption, CrudField } from "@portafolio/core/ui/CrudManager";
import { MATERIAL_LABELS, TYPE_LABELS } from "./content";

const UPLOAD = "/api/admin/fotos";

const opts = (o: Record<string, string>) => Object.entries(o).map(([value, label]) => ({ value, label }));

type Opt = { value: string; label: string };

/** Campos de producto; la familia se elige de las familias existentes. */
export const productFields = (families: Opt[], materials: Opt[] = opts(MATERIAL_LABELS)): CrudField[] => [
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "image", label: "Foto principal", type: "image", uploadUrl: UPLOAD, column: true },
  { name: "familyId", label: "Categoría", type: "select", nullable: true, options: families, column: true },
  { name: "slug", label: "Dirección web", type: "text" },
  { name: "type", label: "Tipo", type: "select", options: opts(TYPE_LABELS), column: true },
  { name: "material", label: "Material", type: "select", options: materials, column: true },
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
  { name: "kind", label: "Tipo", type: "select", options: [{ value: "lista", label: "Lista de opciones" }, { value: "color", label: "Color (con muestra)" }, { value: "numero", label: "Número" }, { value: "sino", label: "Sí / no" }], column: true },
  { name: "unit", label: "Unidad", type: "text", hint: "Solo para números. Ej.: cm" },
  { name: "sortOrder", label: "Orden en el configurador", type: "number", column: true },
];

export const valueFields = (attrs: Opt[]): CrudField[] => [
  { name: "attributeId", label: "Atributo", type: "select", options: attrs, column: true },
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "code", label: "Código", type: "text", column: true },
  { name: "hex", label: "Muestra de color", type: "color", nullable: true, column: true, hint: "Solo en atributos de color." },
  { name: "surcharge", label: "Recargo (S/)", type: "number", step: 0.01, column: true },
  { name: "surchargeKind", label: "Recargo por", type: "select", options: [{ value: "fijo", label: "Unidad" }, { value: "por_m2", label: "m²" }] },
  { name: "onlyFor", label: "Solo para", type: "text", hint: "Materiales o tipos, separados por comas. Vacío = todos." },
  { name: "sortOrder", label: "Orden", type: "number" },
  { name: "active", label: "Activo", type: "boolean", column: true },
];

export const ruleFields = (options: Opt[]): CrudField[] => RULE_FIELDS.map((f) => (f.name === "optionRef" ? { ...f, options } : f));

export const RULE_FIELDS: CrudField[] = [
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "kind", label: "Tipo de regla", type: "select", options: [{ value: "fijo", label: "Importe fijo (S/)" }, { value: "por_m2", label: "Importe por m² (S/)" }, { value: "porcentaje", label: "Porcentaje (%)" }], column: true },
  { name: "amount", label: "Importe", type: "number", step: 0.01, column: true },
  { name: "modelType", label: "Solo para tipo", type: "select", nullable: true, options: opts(TYPE_LABELS), column: true },
  { name: "minArea", label: "A partir de (m²)", type: "number", step: 0.1, nullable: true, column: true },
  { name: "optionRef", label: "Solo si se elige", type: "select", nullable: true, options: [], column: true },
  { name: "active", label: "Activa", type: "boolean", column: true },
];

export const familyFields = (attrOptions: AttrOption[]): CrudField[] => [
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "description", label: "Descripción", type: "textarea" },
  { name: "attributes", label: "Atributos que pide", type: "attrs", attrOptions, column: true, hint: "Valores sin marcar = todos." },
  { name: "minWidth", label: "Ancho mínimo por defecto (cm)", type: "number" },
  { name: "maxWidth", label: "Ancho máximo por defecto (cm)", type: "number", column: true },
  { name: "minHeight", label: "Alto mínimo por defecto (cm)", type: "number" },
  { name: "maxHeight", label: "Alto máximo por defecto (cm)", type: "number", column: true },
  { name: "sortOrder", label: "Orden", type: "number" },
];

export const constraintFields = (families: Opt[], models: Opt[], options: Opt[]): CrudField[] => [
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "kind", label: "Tipo", type: "select", options: [{ value: "incompatibilidad", label: "Incompatibilidad (A bloquea B)" }, { value: "dimension", label: "Medidas (mín./máx.)" }], column: true },
  { name: "familyId", label: "Solo categoría", type: "select", nullable: true, options: families, column: true },
  { name: "modelId", label: "Solo producto", type: "select", nullable: true, options: models },
  { name: "ifOption", label: "Si se elige (A)", type: "select", nullable: true, options, column: true, hint: "En reglas de medidas es opcional (p. ej. solo con cadena)." },
  { name: "thenOption", label: "Bloquear (B)", type: "select", nullable: true, options, column: true, hint: "Funciona en ambos sentidos." },
  { name: "minWidth", label: "Ancho mínimo (cm)", type: "number", nullable: true },
  { name: "maxWidth", label: "Ancho máximo (cm)", type: "number", nullable: true, column: true },
  { name: "minHeight", label: "Alto mínimo (cm)", type: "number", nullable: true },
  { name: "maxHeight", label: "Alto máximo (cm)", type: "number", nullable: true, column: true },
  { name: "message", label: "Mensaje para el cliente", type: "text", hint: "Ej.: Tela Arena no disponible con perfil negro RAL 9005." },
  { name: "active", label: "Activa", type: "boolean", column: true },
];

export const MATERIAL_FIELDS: CrudField[] = [
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "slug", label: "Código", type: "text", column: true, hint: "Minúsculas, sin espacios. Ej.: blackout" },
  { name: "description", label: "Descripción", type: "textarea", column: true },
  { name: "sortOrder", label: "Orden", type: "number" },
  { name: "active", label: "Visible", type: "boolean", column: true },
];

export const variantFields = (models: Opt[], values: Opt[]): CrudField[] => [
  { name: "modelId", label: "Producto", type: "select", options: models, column: true },
  { name: "code", label: "Código (SKU)", type: "text", column: true },
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "valueIds", label: "Combinación", type: "multiselect", options: values, column: true, hint: "Valores que fija esta variante." },
  { name: "attributes", label: "Otros datos", type: "text", hint: "Ej.: cofre 80 mm" },
  { name: "priceAdjustment", label: "Ajuste de precio (S/ por unidad)", type: "number", column: true },
  { name: "sortOrder", label: "Orden", type: "number" },
  { name: "active", label: "Activa", type: "boolean", column: true },
];
