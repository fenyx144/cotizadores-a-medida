/** Campos de cada recurso del catálogo para el CrudManager (servidor y cliente). */
import type { CrudField } from "@portafolio/core/ui/CrudManager";
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

export const ruleFields = (options: Opt[]): CrudField[] => RULE_FIELDS.map((f) => (f.name === "optionRef" ? { ...f, options } : f));

export const RULE_FIELDS: CrudField[] = [
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "kind", label: "Tipo de regla", type: "select", options: [{ value: "fijo", label: "Importe fijo (S/)" }, { value: "por_m2", label: "Importe por m² (S/)" }, { value: "porcentaje", label: "Porcentaje (%)" }], column: true },
  { name: "amount", label: "Importe", type: "number", step: 0.01, column: true },
  { name: "drive", label: "Solo con accionamiento", type: "select", nullable: true, options: [{ value: "manual", label: "Cadena" }, { value: "motor", label: "Motor con mando" }, { value: "sensor", label: "Motor + control centralizado" }], column: true },
  { name: "modelType", label: "Solo para tipo", type: "select", nullable: true, options: opts(TYPE_LABELS), column: true },
  { name: "minArea", label: "A partir de (m²)", type: "number", step: 0.1, nullable: true, column: true },
  { name: "optionRef", label: "Solo si se elige", type: "select", nullable: true, options: [], column: true },
  { name: "active", label: "Activa", type: "boolean", column: true },
];

const DRIVE_OPTS = [{ value: "manual", label: "Cadena" }, { value: "motor", label: "Motor con mando" }, { value: "sensor", label: "Motor + control centralizado" }];

export const familyFields = (frames: Opt[], fabrics: Opt[]): CrudField[] => [
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "description", label: "Descripción", type: "textarea" },
  { name: "requiresFabric", label: "Requiere tela", type: "boolean", column: true },
  { name: "requiresFrame", label: "Requiere color de perfil", type: "boolean", column: true },
  { name: "requiresDrive", label: "Requiere accionamiento", type: "boolean", column: true },
  { name: "minWidth", label: "Ancho mínimo por defecto (cm)", type: "number" },
  { name: "maxWidth", label: "Ancho máximo por defecto (cm)", type: "number", column: true },
  { name: "minHeight", label: "Alto mínimo por defecto (cm)", type: "number" },
  { name: "maxHeight", label: "Alto máximo por defecto (cm)", type: "number", column: true },
  { name: "allowedDrives", label: "Accionamientos permitidos", type: "multiselect", options: DRIVE_OPTS, hint: "Sin marcar = todos.", column: true },
  { name: "allowedFrameIds", label: "Colores de perfil permitidos", type: "multiselect", options: frames, hint: "Sin marcar = todos.", column: true },
  { name: "allowedFabricIds", label: "Telas permitidas", type: "multiselect", options: fabrics, hint: "Sin marcar = todas." },
  { name: "sortOrder", label: "Orden", type: "number" },
];

export const constraintFields = (families: Opt[], models: Opt[], options: Opt[]): CrudField[] => [
  { name: "name", label: "Nombre", type: "text", column: true },
  { name: "kind", label: "Tipo", type: "select", options: [{ value: "incompatibilidad", label: "Incompatibilidad (A bloquea B)" }, { value: "dimension", label: "Medidas (mín./máx.)" }], column: true },
  { name: "familyId", label: "Solo familia", type: "select", nullable: true, options: families, column: true },
  { name: "modelId", label: "Solo producto", type: "select", nullable: true, options: models },
  { name: "ifOption", label: "Si se elige (A)", type: "select", nullable: true, options, column: true, hint: "En reglas de medidas es opcional (p. ej. solo con motor)." },
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
