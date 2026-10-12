/**
 * "Ayúdame a elegir": preguntas cuyas respuestas salen solo de los productos y variantes de la categoría.
 * Cada respuesta filtra la lista; nunca se ofrece una respuesta que deje cero productos.
 */
import { evaluate, variantGroups, variantsFor, type RulesCatalog } from "./rules";
import type { ProductModel, ProductVariant } from "@portafolio/core/db/schema";

export type Answers = Record<number, number>;
export interface GuideItem { model: ProductModel; variant?: ProductVariant; options: Map<number, Set<number>> }
export interface GuideQuestion { attributeId: number; name: string; group?: string; answers: { value: number; label: string; hex?: string; count: number }[] }

/** Productos de la categoría y sus variantes, con los valores posibles de cada atributo de lista. */
/** familyId null: todos los productos. */
export function guideItems(c: RulesCatalog, familyId: number | null): GuideItem[] {
  const out: GuideItem[] = [];
  for (const model of c.models.filter((m) => familyId == null || m.familyId === familyId)) {
    const options = new Map<number, Set<number>>();
    for (const f of evaluate(c, { modelId: model.id }).fields) {
      if (f.kind !== "lista") continue;
      options.set(f.attribute.id, new Set(f.choices.filter((x) => !x.disabled).map((x) => x.value as number)));
    }
    out.push({ model, options });
    for (const variant of variantsFor(c, model.id)) {
      const vo = new Map(options);
      for (const [a, g] of variantGroups(c, variant)) if (options.has(a)) vo.set(a, new Set(g.filter((x) => options.get(a)!.has(x))));
      out.push({ model, variant, options: vo });
    }
  }
  return out;
}

export const matches = (items: GuideItem[], answers: Answers) =>
  items.filter((it) => Object.entries(answers).every(([a, v]) => !it.options.has(Number(a)) || it.options.get(Number(a))!.has(v)));

const productCount = (items: GuideItem[]) => new Set(items.map((i) => i.model.id)).size;

/** Siguiente pregunta útil (al menos dos respuestas posibles), sin las ya respondidas u omitidas. */
export function nextQuestion(c: RulesCatalog, items: GuideItem[], answers: Answers, skipped: number[]): GuideQuestion | null {
  const left = matches(items, answers);
  const attrIds = [...new Set(left.flatMap((i) => [...i.options.keys()]))]
    .filter((a) => answers[a] == null && !skipped.includes(a))
    .sort((x, y) => { const ax = c.attributes.find((a) => a.id === x)!, ay = c.attributes.find((a) => a.id === y)!; return ax.sortOrder - ay.sortOrder || ax.id - ay.id; });
  for (const a of attrIds) {
    const vals = [...new Set(left.flatMap((i) => [...(i.options.get(a) ?? [])]))];
    const answersFor = vals
      .map((v) => {
        const hit = left.filter((i) => !i.options.has(a) || i.options.get(a)!.has(v));
        const val = c.values.find((x) => x.id === v);
        return { value: v, label: val?.name ?? String(v), hex: val?.hex || undefined, count: productCount(hit), sort: val?.sortOrder ?? 0 };
      })
      .filter((x) => x.count > 0)
      .sort((x, y) => x.sort - y.sort || x.value - y.value)
      .map(({ sort: _s, ...x }) => x);
    if (answersFor.length >= 2) return { attributeId: a, name: c.attributes.find((x) => x.id === a)!.name, answers: answersFor };
  }
  return null;
}

/** Resultado: productos que encajan, con sus variantes compatibles. */
export function guideResults(items: GuideItem[], answers: Answers) {
  const left = matches(items, answers);
  const byModel = new Map<number, { model: ProductModel; variants: ProductVariant[] }>();
  for (const it of left) {
    const e = byModel.get(it.model.id) ?? { model: it.model, variants: [] };
    if (it.variant) e.variants.push(it.variant);
    byModel.set(it.model.id, e);
  }
  return [...byModel.values()];
}

/** Respuestas que aplican a un producto (para precargar la configuración). */
export const answersFor = (items: GuideItem[], modelId: number, answers: Answers): Answers => {
  const base = items.find((i) => i.model.id === modelId && !i.variant);
  return Object.fromEntries(Object.entries(answers).filter(([a, v]) => base?.options.get(Number(a))?.has(v))) as Answers;
};

/** Atributos que el asistente aún debe preguntar: ni fijados por la variante ni respondidos en la guía. */
export function stepsToAsk<T extends { attribute: { id: number } }>(fields: T[], locked: number[], answered: number[]): T[] {
  return fields.filter((f) => !locked.includes(f.attribute.id) && !answered.includes(f.attribute.id));
}
