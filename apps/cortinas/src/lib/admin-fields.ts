/** Campos de cada recurso del catálogo para el CrudManager (servidor y cliente). */
import type { CrudField } from "@portafolio/core/ui/CrudManager";
import { MATERIAL_LABELS, TYPE_LABELS } from "./content";

const opts = (o: Record<string, string>) => Object.entries(o).map(([value, label]) => ({ value, label }));

export const PRODUCT_FIELDS: CrudField[] = [
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "slug", label: "Slug (URL)", type: "text" },
  { name: "type", label: "Tipo", type: "select", options: opts(TYPE_LABELS), column: true },
  { name: "material", label: "Material", type: "select", options: opts(MATERIAL_LABELS), column: true },
  { name: "uses", label: "Usos", type: "text", hint: "Separados por comas: educacion,oficinas,salud", column: true },
  { name: "tagline", label: "Frase corta", type: "text" },
  { name: "description", label: "Descripción", type: "textarea" },
  { name: "image", label: "Imagen", type: "text", hint: "Ruta, ej: /img/producto-roller.webp" },
  { name: "minWidth", label: "Ancho mínimo (cm)", type: "number" },
  { name: "maxWidth", label: "Ancho máximo (cm)", type: "number", column: true },
  { name: "minProjection", label: "Alto mínimo (cm)", type: "number" },
  { name: "maxProjection", label: "Alto máximo (cm)", type: "number", column: true },
  { name: "basePrice", label: "Precio base (S/)", type: "number", column: true },
  { name: "pricePerM2", label: "Precio por m² (S/)", type: "number", column: true },
  { name: "sortOrder", label: "Orden", type: "number" },
  { name: "active", label: "Visible en la web", type: "boolean", column: true },
];

export const FABRIC_FIELDS: CrudField[] = [
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "code", label: "Código", type: "text", column: true },
  { name: "collection", label: "Colección", type: "text", column: true },
  { name: "hex", label: "Color", type: "color", column: true },
  { name: "types", label: "Para", type: "text", hint: "Tipos o materiales separados por comas (vacío = todos)", column: true },
  { name: "surchargePerM2", label: "Suplemento (S/ por m²)", type: "number", column: true },
  { name: "sortOrder", label: "Orden", type: "number" },
  { name: "active", label: "Visible", type: "boolean", column: true },
];

export const FRAME_FIELDS: CrudField[] = [
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "ral", label: "RAL", type: "text", column: true },
  { name: "hex", label: "Color", type: "color", column: true },
  { name: "surcharge", label: "Suplemento por cortina (S/)", type: "number", column: true },
  { name: "sortOrder", label: "Orden", type: "number" },
  { name: "active", label: "Visible", type: "boolean", column: true },
];

export const RULE_FIELDS: CrudField[] = [
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "kind", label: "Tipo de regla", type: "select", options: [{ value: "fijo", label: "Importe fijo (S/)" }, { value: "por_m2", label: "Importe por m² (S/)" }, { value: "porcentaje", label: "Porcentaje (%)" }], column: true },
  { name: "amount", label: "Importe", type: "number", step: 0.01, column: true },
  { name: "drive", label: "Solo con accionamiento", type: "select", nullable: true, options: [{ value: "manual", label: "Cadena" }, { value: "motor", label: "Motor con mando" }, { value: "sensor", label: "Motor + control centralizado" }], column: true },
  { name: "modelType", label: "Solo para tipo", type: "select", nullable: true, options: opts(TYPE_LABELS), column: true },
  { name: "minArea", label: "A partir de (m²)", type: "number", step: 0.1, nullable: true, column: true },
  { name: "active", label: "Activa", type: "boolean", column: true },
];
