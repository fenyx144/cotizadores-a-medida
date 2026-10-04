/**
 * Definición de los campos de cada recurso del catálogo para el CrudManager.
 * Son objetos simples, así que sirven tanto en servidor como en cliente.
 */
import type { CrudField } from "@portafolio/core/ui/CrudManager";
import { TYPE_LABELS } from "./content";

const typeOptions = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }));

export const MODEL_FIELDS: CrudField[] = [
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "slug", label: "Slug (URL)", type: "text" },
  { name: "type", label: "Tipo", type: "select", options: typeOptions, column: true },
  { name: "tagline", label: "Frase corta", type: "text" },
  { name: "description", label: "Descripción", type: "textarea" },
  { name: "image", label: "Imagen", type: "text", hint: "Ruta, ej: /img/modelo-cofre.webp" },
  { name: "minWidth", label: "Ancho mínimo (cm)", type: "number", column: true },
  { name: "maxWidth", label: "Ancho máximo (cm)", type: "number", column: true },
  { name: "minProjection", label: "Salida/caída mínima (cm)", type: "number" },
  { name: "maxProjection", label: "Salida/caída máxima (cm)", type: "number" },
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
  { name: "pattern", label: "Dibujo", type: "select", options: [{ value: "liso", label: "Liso" }, { value: "rayas", label: "Rayas" }], column: true },
  { name: "stripeHex", label: "Color de raya", type: "text", nullable: true, hint: "Solo para rayas, ej: #B4552F" },
  { name: "surchargePerM2", label: "Suplemento (S/ por m²)", type: "number", column: true },
  { name: "sortOrder", label: "Orden", type: "number" },
  { name: "active", label: "Visible", type: "boolean", column: true },
];

export const FRAME_FIELDS: CrudField[] = [
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "ral", label: "RAL", type: "text", column: true },
  { name: "hex", label: "Color", type: "color", column: true },
  { name: "surcharge", label: "Suplemento (S/)", type: "number", column: true },
  { name: "sortOrder", label: "Orden", type: "number" },
  { name: "active", label: "Visible", type: "boolean", column: true },
];

export const RULE_FIELDS: CrudField[] = [
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "kind", label: "Tipo de regla", type: "select", options: [{ value: "fijo", label: "Importe fijo (S/)" }, { value: "por_m2", label: "Importe por m² (S/)" }, { value: "porcentaje", label: "Porcentaje (%)" }], column: true },
  { name: "amount", label: "Importe", type: "number", step: 0.01, column: true },
  { name: "drive", label: "Solo con accionamiento", type: "select", nullable: true, options: [{ value: "manual", label: "Manual" }, { value: "motor", label: "Motor" }, { value: "sensor", label: "Motor + sensor" }], column: true },
  { name: "modelType", label: "Solo para tipo", type: "select", nullable: true, options: typeOptions, column: true },
  { name: "minArea", label: "A partir de (m²)", type: "number", step: 0.1, nullable: true, column: true },
  { name: "active", label: "Activa", type: "boolean", column: true },
];

export const ZONE_FIELDS: CrudField[] = [
  { name: "name", label: "Distrito", type: "text", column: true },
  { name: "city", label: "Ciudad", type: "text", column: true },
  { name: "sortOrder", label: "Orden", type: "number" },
  { name: "active", label: "Hacemos visitas", type: "boolean", column: true },
];
