/**
 * Motor de reglas del configurador (puro: corre igual en el navegador y en el servidor).
 *
 * A partir de una selección (producto, tela, perfil, accionamiento, medidas) calcula:
 * - qué opciones se muestran (familia: opciones permitidas) y cuáles quedan deshabilitadas
 *   por reglas de incompatibilidad, con el motivo;
 * - los límites de ancho/alto (producto ∩ familia ∩ reglas de dimensión);
 * - los errores de la selección actual por campo.
 */
import type { Drive } from "@portafolio/core/pricing";
import type { ConstraintRule, Fabric, FrameColor, Material, ProductFamily, ProductModel, ProductVariant } from "@portafolio/core/db/schema";

export const DRIVES: Drive[] = ["manual", "motor", "sensor"];
export const DRIVE_NAMES: Record<Drive, string> = { manual: "Cadena", motor: "Motor con mando", sensor: "Motor + control centralizado" };
export const MATERIAL_NAMES: Record<string, string> = { screen: "Screen", blackout: "Blackout", mixto: "Mixto (día/noche)", pvc: "PVC", aluminio: "Aluminio" };

export interface RulesCatalog {
  models: ProductModel[];
  fabrics: Fabric[];
  frames: FrameColor[];
  families?: ProductFamily[];
  constraints?: ConstraintRule[];
  materials?: Material[];
  variants?: ProductVariant[];
}

export interface Selection {
  modelId: number;
  fabricId?: number | null;
  frameColorId?: number | null;
  drive?: Drive | null;
  width?: number | null;
  height?: number | null;
}

export type Field = "model" | "fabric" | "frame" | "drive" | "width" | "height";
export interface Choice<T> { value: T; label: string; disabled?: string }

export interface Evaluation {
  model?: ProductModel;
  family?: ProductFamily;
  requires: { fabric: boolean; frame: boolean; drive: boolean };
  fabrics: Choice<number>[];
  frames: Choice<number>[];
  drives: Choice<Drive>[];
  limits: { minWidth: number; maxWidth: number; minHeight: number; maxHeight: number };
  errors: Partial<Record<Field, string>>;
}

const list = (s: string | null | undefined) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []);
const m = (cm: number) => `${(cm / 100).toFixed(2).replace(".", ",")} m`;

/** Telas compatibles por tipo/material del producto (campo `types` de la tela). */
export function fabricsByType(fabrics: Fabric[], model: { type: string; material: string }) {
  return fabrics.filter((f) => !f.types || list(f.types).includes(model.type) || list(f.types).includes(model.material));
}

/** Etiqueta legible de una referencia "tipo:valor". */
export function optionLabel(c: RulesCatalog, ref: string | null | undefined): string {
  if (!ref) return "";
  const [t, v] = ref.split(":");
  if (t === "tela") { const f = c.fabrics.find((x) => String(x.id) === v); return f ? `tela ${f.name}${f.code ? ` (${f.code})` : ""}` : ref; }
  if (t === "perfil") { const f = c.frames.find((x) => String(x.id) === v); return f ? `perfil ${f.name}${f.ral ? ` RAL ${f.ral}` : ""}` : ref; }
  if (t === "accionamiento") return DRIVE_NAMES[v as Drive] ?? v;
  if (t === "material") return `material ${c.materials?.find((x) => x.slug === v)?.name ?? MATERIAL_NAMES[v] ?? v}`;
  if (t === "producto") return c.models.find((x) => String(x.id) === v)?.name ?? ref;
  if (t === "familia") return `familia ${c.families?.find((x) => String(x.id) === v)?.name ?? v}`;
  return ref;
}

/** Todas las opciones que se pueden usar en una regla, para los selects del admin. */
export function optionChoices(c: RulesCatalog) {
  return [
    ...c.fabrics.map((f) => ({ value: `tela:${f.id}`, label: `Tela · ${f.name} (${f.code || f.collection})` })),
    ...c.frames.map((f) => ({ value: `perfil:${f.id}`, label: `Perfil · ${f.name}${f.ral ? ` RAL ${f.ral}` : ""}` })),
    ...DRIVES.map((d) => ({ value: `accionamiento:${d}`, label: `Accionamiento · ${DRIVE_NAMES[d]}` })),
    ...(c.materials?.length ? c.materials.map((x) => [x.slug, x.name] as const) : Object.entries(MATERIAL_NAMES)).map(([k, v]) => ({ value: `material:${k}`, label: `Material · ${v}` })),
    ...c.models.map((p) => ({ value: `producto:${p.id}`, label: `Producto · ${p.name}` })),
    ...(c.families ?? []).map((f) => ({ value: `familia:${f.id}`, label: `Familia · ${f.name}` })),
  ];
}

/** Referencias de la selección ("tela:6", "perfil:3", "material:blackout"…), opcionalmente sin un campo. */
export function selectionRefs(c: RulesCatalog, sel: Selection, except?: "fabric" | "frame" | "drive"): Set<string> {
  const refs = new Set<string>();
  const model = c.models.find((x) => x.id === sel.modelId);
  if (model) {
    refs.add(`producto:${model.id}`);
    refs.add(`material:${model.material}`);
    if (model.familyId) refs.add(`familia:${model.familyId}`);
  }
  if (except !== "fabric" && sel.fabricId) refs.add(`tela:${sel.fabricId}`);
  if (except !== "frame" && sel.frameColorId) refs.add(`perfil:${sel.frameColorId}`);
  if (except !== "drive" && sel.drive) refs.add(`accionamiento:${sel.drive}`);
  return refs;
}

function ruleScopeMatches(r: ConstraintRule, model: ProductModel) {
  if (r.modelId && r.modelId !== model.id) return false;
  if (r.familyId && r.familyId !== model.familyId) return false;
  return true;
}

/** Motivo por el que `ref` queda bloqueada dadas las demás opciones elegidas (o undefined). */
function blockedBy(c: RulesCatalog, model: ProductModel, ref: string, others: Set<string>): string | undefined {
  for (const r of c.constraints ?? []) {
    if (!r.active || r.kind !== "incompatibilidad" || !r.ifOption || !r.thenOption || !ruleScopeMatches(r, model)) continue;
    const hit = (r.thenOption === ref && others.has(r.ifOption)) || (r.ifOption === ref && others.has(r.thenOption));
    if (hit) return r.message || `No disponible con ${optionLabel(c, r.thenOption === ref ? r.ifOption : r.thenOption)}.`;
  }
  return undefined;
}

export function evaluate(c: RulesCatalog, sel: Selection): Evaluation {
  const model = c.models.find((x) => x.id === sel.modelId);
  const empty: Evaluation = { requires: { fabric: true, frame: true, drive: true }, fabrics: [], frames: [], drives: [], limits: { minWidth: 0, maxWidth: 0, minHeight: 0, maxHeight: 0 }, errors: { model: "Elija un producto." } };
  if (!model) return empty;
  const family = model.familyId ? c.families?.find((f) => f.id === model.familyId) : undefined;
  const requires = { fabric: family?.requiresFabric ?? true, frame: family?.requiresFrame ?? true, drive: family?.requiresDrive ?? true };

  const allowF = list(family?.allowedFabricIds), allowP = list(family?.allowedFrameIds), allowD = list(family?.allowedDrives);
  const fabrics = fabricsByType(c.fabrics, model)
    .filter((f) => !allowF.length || allowF.includes(String(f.id)))
    .map((f) => ({ value: f.id, label: `${f.collection ? `${f.collection} · ` : ""}${f.name}`, disabled: blockedBy(c, model, `tela:${f.id}`, selectionRefs(c, sel, "fabric")) }));
  const frames = c.frames
    .filter((f) => !allowP.length || allowP.includes(String(f.id)))
    .map((f) => ({ value: f.id, label: `${f.name}${f.ral ? ` · RAL ${f.ral}` : ""}`, disabled: blockedBy(c, model, `perfil:${f.id}`, selectionRefs(c, sel, "frame")) }));
  const drives = DRIVES.filter((d) => !allowD.length || allowD.includes(d)).map((d) => ({ value: d, label: DRIVE_NAMES[d], disabled: blockedBy(c, model, `accionamiento:${d}`, selectionRefs(c, sel, "drive")) }));

  // Límites: producto ∩ familia ∩ reglas de dimensión que apliquen.
  const limits = { minWidth: model.minWidth, maxWidth: model.maxWidth, minHeight: model.minProjection, maxHeight: model.maxProjection };
  const why: Partial<Record<keyof typeof limits, string>> = {};
  const tighten = (k: keyof typeof limits, v: number | null | undefined, msg?: string) => {
    if (v == null) return;
    const isMin = k.startsWith("min");
    if (isMin ? v > limits[k] : v < limits[k]) { limits[k] = v; if (msg) why[k] = msg; }
  };
  if (family) { tighten("minWidth", family.minWidth); tighten("maxWidth", family.maxWidth); tighten("minHeight", family.minHeight); tighten("maxHeight", family.maxHeight); }
  const refs = selectionRefs(c, sel);
  for (const r of c.constraints ?? []) {
    if (!r.active || r.kind !== "dimension" || !ruleScopeMatches(r, model)) continue;
    if (r.ifOption && !refs.has(r.ifOption)) continue;
    const msg = r.message || r.name;
    tighten("minWidth", r.minWidth, msg); tighten("maxWidth", r.maxWidth, msg); tighten("minHeight", r.minHeight, msg); tighten("maxHeight", r.maxHeight, msg);
  }

  const errors: Evaluation["errors"] = {};
  const w = sel.width ?? 0, h = sel.height ?? 0;
  if (w && (w < limits.minWidth || w > limits.maxWidth)) errors.width = `Ancho entre ${m(limits.minWidth)} y ${m(limits.maxWidth)}.${why[w > limits.maxWidth ? "maxWidth" : "minWidth"] ? ` ${why[w > limits.maxWidth ? "maxWidth" : "minWidth"]}` : ""}`;
  if (h && (h < limits.minHeight || h > limits.maxHeight)) errors.height = `Alto entre ${m(limits.minHeight)} y ${m(limits.maxHeight)}.${why[h > limits.maxHeight ? "maxHeight" : "minHeight"] ? ` ${why[h > limits.maxHeight ? "maxHeight" : "minHeight"]}` : ""}`;
  const check = <T,>(field: Field, req: boolean, value: T | null | undefined, choices: Choice<T>[], name: string) => {
    if (!req) return;
    if (value == null || value === 0 || (value as unknown) === "") { errors[field] = `Elija ${name}.`; return; }
    const ch = choices.find((x) => x.value === value);
    if (!ch) errors[field] = `${name[0].toUpperCase()}${name.slice(1)} no disponible para ${model.name}.`;
    else if (ch.disabled) errors[field] = ch.disabled;
  };
  check("fabric", requires.fabric, sel.fabricId, fabrics, "la tela");
  check("frame", requires.frame, sel.frameColorId, frames, "el perfil");
  check("drive", requires.drive, sel.drive, drives, "el accionamiento");
  return { model, family, requires, fabrics, frames, drives, limits, errors };
}

/** Primera opción habilitada (para autoseleccionar al cambiar de producto). */
export function firstEnabled<T>(choices: Choice<T>[], current?: T | null): T | undefined {
  const cur = choices.find((x) => x.value === current && !x.disabled);
  return cur ? cur.value : choices.find((x) => !x.disabled)?.value;
}

/** Variantes activas de un producto. */
export function variantsFor(c: RulesCatalog, modelId: number) {
  return (c.variants ?? []).filter((v) => v.active && v.modelId === modelId).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
}

/** Variante que corresponde a una combinación: la más específica (tela y perfil) primero. */
export function matchVariant(c: RulesCatalog, sel: { modelId: number; fabricId?: number | null; frameColorId?: number | null }) {
  const score = (v: ProductVariant) => (v.fabricId ? 2 : 0) + (v.frameColorId ? 1 : 0);
  return variantsFor(c, sel.modelId)
    .filter((v) => (!v.fabricId || v.fabricId === sel.fabricId) && (!v.frameColorId || v.frameColorId === sel.frameColorId))
    .sort((a, b) => score(b) - score(a))[0];
}
