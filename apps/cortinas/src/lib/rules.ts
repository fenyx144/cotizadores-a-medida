/**
 * Motor de reglas del configurador (puro: corre igual en el navegador y en el servidor).
 *
 * Modelo genérico: cada familia (categoría) pide una lista de atributos (Tela, Color del perfil,
 * Accionamiento, Lado del mando…), obligatorios o no, con sus valores permitidos. A partir de
 * una selección calcula los campos a mostrar, los valores bloqueados por incompatibilidad
 * (con motivo), los límites de medidas y los errores.
 *
 * Referencias usadas por reglas, recargos y variantes: "v:<id de valor>", "producto:<id>",
 * "familia:<id>", "material:<slug>".
 */
import type { Attribute, AttributeValue, ConstraintRule, FamilyAttribute, Material, ProductFamily, ProductModel, ProductVariant } from "@portafolio/core/db/schema";

export const ATTRIBUTE_KINDS = { lista: "Lista de opciones", color: "Color (con muestra)", numero: "Número", sino: "Sí / no" } as const;
export type AttributeKind = keyof typeof ATTRIBUTE_KINDS;
export const MATERIAL_NAMES: Record<string, string> = { screen: "Screen", blackout: "Blackout", mixto: "Mixto (día/noche)", pvc: "PVC", aluminio: "Aluminio" };

export interface RulesCatalog {
  models: ProductModel[];
  attributes: Attribute[];
  values: AttributeValue[];
  families?: ProductFamily[];
  constraints?: ConstraintRule[];
  materials?: Material[];
  variants?: ProductVariant[];
}

/** Valor elegido por atributo: id de valor (lista/color), número o sí/no. Clave = id del atributo. */
export type Values = Record<string, number | boolean | null | undefined>;

export interface Selection {
  modelId: number;
  values?: Values;
  width?: number | null;
  height?: number | null;
}

export interface Choice<T> { value: T; label: string; disabled?: string; hex?: string }

export interface EvalField {
  attribute: Attribute;
  kind: AttributeKind;
  required: boolean;
  /** Opciones (lista/color). Para sí/no, el valor que se suma al marcar. */
  choices: Choice<number>[];
}

export interface Evaluation {
  model?: ProductModel;
  family?: ProductFamily;
  fields: EvalField[];
  limits: { minWidth: number; maxWidth: number; minHeight: number; maxHeight: number };
  /** Claves: "model", "width", "height" o "a<id de atributo>". */
  errors: Record<string, string>;
}

const list = (s: string | null | undefined) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []);
const m = (cm: number) => `${(cm / 100).toFixed(2).replace(".", ",")} m`;
export const ids = (s: string | null | undefined) => list(s).map(Number).filter(Boolean);
const byOrder = <T extends { sortOrder: number; id: number }>(a: T, b: T) => a.sortOrder - b.sortOrder || a.id - b.id;

/** Atributos que pide la familia del producto, en el orden de los atributos. */
export function familyAttributes(c: RulesCatalog, model: ProductModel): (FamilyAttribute & { attribute: Attribute })[] {
  const family = model.familyId ? c.families?.find((f) => f.id === model.familyId) : undefined;
  const conf: FamilyAttribute[] = family?.attributes?.length ? family.attributes : c.attributes.map((a) => ({ attributeId: a.id, required: false, valueIds: [] }));
  return conf
    .map((fa) => ({ ...fa, attribute: c.attributes.find((a) => a.id === fa.attributeId)! }))
    .filter((x) => x.attribute)
    .sort((a, b) => byOrder(a.attribute, b.attribute));
}

/** Valores activos de un atributo que sirven para el producto y la familia. */
export function valuesFor(c: RulesCatalog, attributeId: number, model?: ProductModel, allowed: number[] = []) {
  return c.values
    .filter((v) => v.active && v.attributeId === attributeId)
    .filter((v) => !model || !v.onlyFor || list(v.onlyFor).includes(model.type) || list(v.onlyFor).includes(model.material))
    .filter((v) => !allowed.length || allowed.includes(v.id))
    .sort(byOrder);
}

/** Texto de un valor ("Arena (BK-03)"). */
export const valueText = (v: AttributeValue) => `${v.name}${v.code && v.code !== v.name ? ` (${v.code})` : ""}`;

/** Etiqueta legible de una referencia. */
export function optionLabel(c: RulesCatalog, ref: string | null | undefined): string {
  if (!ref) return "";
  const [t, v] = ref.split(":");
  if (t === "v") {
    const val = c.values.find((x) => String(x.id) === v);
    const attr = val && c.attributes.find((a) => a.id === val.attributeId);
    return val ? `${attr ? `${attr.name.toLowerCase()} ` : ""}${valueText(val)}` : ref;
  }
  if (t === "material") return `material ${c.materials?.find((x) => x.slug === v)?.name ?? MATERIAL_NAMES[v] ?? v}`;
  if (t === "producto") return c.models.find((x) => String(x.id) === v)?.name ?? ref;
  if (t === "familia") return `categoría ${c.families?.find((x) => String(x.id) === v)?.name ?? v}`;
  return ref;
}

/** Todas las opciones que se pueden usar en reglas y recargos, para los selects del admin. */
export function optionChoices(c: RulesCatalog) {
  const attrs = [...c.attributes].sort(byOrder);
  return [
    ...attrs.flatMap((a) => c.values.filter((v) => v.attributeId === a.id).sort(byOrder).map((v) => ({ value: `v:${v.id}`, label: `${a.name} · ${valueText(v)}` }))),
    ...(c.materials?.length ? c.materials.map((x) => [x.slug, x.name] as const) : Object.entries(MATERIAL_NAMES)).map(([k, v]) => ({ value: `material:${k}`, label: `Material · ${v}` })),
    ...c.models.map((p) => ({ value: `producto:${p.id}`, label: `Producto · ${p.name}` })),
    ...(c.families ?? []).map((f) => ({ value: `familia:${f.id}`, label: `Categoría · ${f.name}` })),
  ];
}

/** Ids de valor elegidos en una selección (lista/color: el valor; sí/no marcado: su valor "Sí"). */
export function selectedValueIds(c: RulesCatalog, sel: Selection, exceptAttr?: number): number[] {
  const out: number[] = [];
  for (const [k, raw] of Object.entries(sel.values ?? {})) {
    const attrId = Number(k);
    if (attrId === exceptAttr || raw == null || raw === false) continue;
    const attr = c.attributes.find((a) => a.id === attrId);
    if (!attr) continue;
    if (attr.kind === "sino") { const yes = valuesFor(c, attrId)[0]; if (yes) out.push(yes.id); }
    else if (attr.kind !== "numero" && typeof raw === "number") out.push(raw);
  }
  return out;
}

/** Referencias de la selección ("v:12", "producto:2", "material:blackout"…). */
export function selectionRefs(c: RulesCatalog, sel: Selection, exceptAttr?: number): Set<string> {
  const refs = new Set<string>();
  const model = c.models.find((x) => x.id === sel.modelId);
  if (model) {
    refs.add(`producto:${model.id}`);
    refs.add(`material:${model.material}`);
    if (model.familyId) refs.add(`familia:${model.familyId}`);
  }
  for (const id of selectedValueIds(c, sel, exceptAttr)) refs.add(`v:${id}`);
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
  if (!model) return { fields: [], limits: { minWidth: 0, maxWidth: 0, minHeight: 0, maxHeight: 0 }, errors: { model: "Elija un producto." } };
  const family = model.familyId ? c.families?.find((f) => f.id === model.familyId) : undefined;
  const vals = sel.values ?? {};

  const fields: EvalField[] = familyAttributes(c, model).map(({ attribute, required, valueIds }) => {
    const others = selectionRefs(c, sel, attribute.id);
    const choices = valuesFor(c, attribute.id, model, valueIds).map((v) => ({
      value: v.id, label: valueText(v), hex: attribute.kind === "color" ? v.hex || undefined : undefined, disabled: blockedBy(c, model, `v:${v.id}`, others),
    }));
    return { attribute, kind: (attribute.kind as AttributeKind) ?? "lista", required, choices };
  });

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
  const reason = (k: keyof typeof limits) => (why[k] ? ` ${why[k]}` : "");
  if (w && (w < limits.minWidth || w > limits.maxWidth)) errors.width = `Ancho entre ${m(limits.minWidth)} y ${m(limits.maxWidth)}.${reason(w > limits.maxWidth ? "maxWidth" : "minWidth")}`;
  if (h && (h < limits.minHeight || h > limits.maxHeight)) errors.height = `Alto entre ${m(limits.minHeight)} y ${m(limits.maxHeight)}.${reason(h > limits.maxHeight ? "maxHeight" : "minHeight")}`;
  for (const f of fields) {
    const key = `a${f.attribute.id}`, v = vals[f.attribute.id], name = f.attribute.name.toLowerCase();
    if (f.kind === "sino") {
      if (v === true && f.choices[0]?.disabled) errors[key] = f.choices[0].disabled;
      continue;
    }
    if (f.kind === "numero") { if (f.required && (v == null || v === "" as unknown)) errors[key] = `Indique ${name}.`; continue; }
    if (v == null || v === 0) { if (f.required) errors[key] = `Elija ${name}.`; continue; }
    const ch = f.choices.find((x) => x.value === v);
    if (!ch) errors[key] = `${f.attribute.name} no disponible para ${model.name}.`;
    else if (ch.disabled) errors[key] = ch.disabled;
  }
  return { model, family, fields, limits, errors };
}

export function firstEnabled<T>(choices: Choice<T>[]): T | undefined {
  return (choices.find((x) => !x.disabled) ?? choices[0])?.value;
}

/**
 * Completa la selección: en listas y colores, si falta el valor o ya no aplica, toma el primero
 * disponible (recalculando, porque elegir uno puede bloquear otro). Quita atributos que la familia no pide.
 * Con keepBlocked se conservan los valores bloqueados por una regla (la tabla los marca en rojo).
 */
export function withDefaults(c: RulesCatalog, sel: Selection, keepBlocked = false): Values {
  const model = c.models.find((x) => x.id === sel.modelId);
  if (!model) return {};
  const fas = familyAttributes(c, model);
  const out: Values = {};
  for (const fa of fas) if (sel.values?.[fa.attributeId] != null) out[fa.attributeId] = sel.values[fa.attributeId];
  for (const fa of fas) {
    const kind = fa.attribute.kind;
    if (kind === "sino") { out[fa.attributeId] = out[fa.attributeId] === true; continue; }
    if (kind === "numero") continue;
    const field = evaluate(c, { ...sel, values: out }).fields.find((f) => f.attribute.id === fa.attributeId)!;
    const cur = out[fa.attributeId];
    const ok = field.choices.find((x) => x.value === cur && (keepBlocked || !x.disabled));
    if (!ok && (fa.required || cur != null)) out[fa.attributeId] = firstEnabled(field.choices) ?? null;
    else if (!ok && cur == null) out[fa.attributeId] = firstEnabled(field.choices) ?? null;
  }
  return out;
}

/** Variantes activas de un producto. */
export function variantsFor(c: RulesCatalog, modelId: number) {
  return (c.variants ?? []).filter((v) => v.active && v.modelId === modelId).sort(byOrder);
}

/** Variante que corresponde a una selección: todos sus valores elegidos; la más específica primero. */
export function matchVariant(c: RulesCatalog, sel: Selection) {
  const chosen = new Set(selectedValueIds(c, sel));
  return variantsFor(c, sel.modelId)
    .map((v) => ({ v, need: ids(v.valueIds) }))
    .filter(({ need }) => need.every((id) => chosen.has(id)))
    .sort((a, b) => b.need.length - a.need.length)[0]?.v;
}

/** Valores que fija una variante, por atributo. */
export function variantValues(c: RulesCatalog, variant: ProductVariant): Values {
  const out: Values = {};
  for (const id of ids(variant.valueIds)) {
    const v = c.values.find((x) => x.id === id);
    if (!v) continue;
    const a = c.attributes.find((x) => x.id === v.attributeId);
    out[v.attributeId] = a?.kind === "sino" ? true : v.id;
  }
  return out;
}

/** Solo los atributos que pide la familia del producto (descarta claves ajenas). */
export function cleanValues(c: RulesCatalog, modelId: number, values: Values | null | undefined): Values {
  const model = c.models.find((x) => x.id === modelId);
  if (!model || !values) return {};
  const out: Values = {};
  for (const fa of familyAttributes(c, model)) {
    const v = values[fa.attributeId];
    if (v != null) out[fa.attributeId] = v;
  }
  return out;
}

/** Atributos que usa alguna categoría (columnas de la tabla y de la plantilla), en orden. */
export function gridAttributes(c: RulesCatalog): Attribute[] {
  const used = new Set<number>();
  for (const m of c.models) for (const fa of familyAttributes(c, m)) used.add(fa.attributeId);
  return c.attributes.filter((a) => used.has(a.id)).sort(byOrder);
}

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

/** Interpreta el texto de una celda (pegado o importado) como valor del atributo. undefined = no reconocido. */
export function parseAttributeCell(c: RulesCatalog, attr: Attribute, text: string, model?: ProductModel): number | boolean | null | undefined {
  const t = fold(text);
  if (!t) return null;
  if (attr.kind === "sino") return /^(si|s|x|1|true|yes)$/.test(t) ? true : /^(no|n|0|false|-)$/.test(t) ? false : undefined;
  if (attr.kind === "numero") { const n = Number(t.replace(",", ".").replace(/[^\d.-]/g, "")); return Number.isFinite(n) && t.match(/\d/) ? n : undefined; }
  const vals = valuesFor(c, attr.id, model);
  const digits = t.replace(/\D/g, "");
  const hit =
    vals.find((v) => fold(v.name) === t || (v.code && fold(v.code) === t)) ??
    vals.find((v) => digits.length >= 3 && v.code.replace(/\D/g, "") === digits) ??
    vals.find((v) => fold(v.name).startsWith(t) || t.startsWith(fold(v.name))) ??
    vals.find((v) => fold(v.name).includes(t) || t.includes(fold(v.name)));
  return hit ? hit.id : undefined;
}
