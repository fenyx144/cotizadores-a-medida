"use client";
/**
 * Reglas del configurador: constructor que se lee como una frase, matriz de compatibilidad,
 * probador y aviso de conflictos. Habla con /api/admin/constraints.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ConstraintRule, RuleCondition } from "@portafolio/core/db/schema";
import type { CatalogData } from "@/lib/line-price";
import { RULE_EFFECTS, evaluate, familyAttributes, findConflicts, ruleSentence, valuesFor, type RuleEffect, type Values } from "@/lib/rules";

type Draft = {
  id?: number; name: string; scope: "todas" | "familia" | "producto"; familyId: number | null; modelId: number | null;
  conditions: RuleCondition[]; kind: RuleEffect; targetAttributeId: number | null; targetValueIds: number[];
  minWidth: string; maxWidth: string; minHeight: string; maxHeight: string; surcharge: string; surchargeKind: "fijo" | "por_m2";
  message: string; active: boolean; source: string;
};
const sel = "border-b border-line bg-transparent py-1 outline-none focus:border-ink";
const chip = (on: boolean) => `border px-2 py-0.5 text-xs ${on ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"}`;
const num = (s: string) => (s.trim() === "" ? null : Number(s));

function toDraft(r?: ConstraintRule): Draft {
  return {
    id: r?.id, name: r?.name ?? "", scope: r?.modelId ? "producto" : r?.familyId ? "familia" : "todas", familyId: r?.familyId ?? null, modelId: r?.modelId ?? null,
    conditions: r?.conditions ?? [], kind: (r?.kind as RuleEffect) ?? "bloquear", targetAttributeId: r?.targetAttributeId ?? null, targetValueIds: r?.targetValueIds ?? [],
    minWidth: r?.minWidth?.toString() ?? "", maxWidth: r?.maxWidth?.toString() ?? "", minHeight: r?.minHeight?.toString() ?? "", maxHeight: r?.maxHeight?.toString() ?? "",
    surcharge: r?.surcharge ? String(r.surcharge) : "", surchargeKind: (r?.surchargeKind as "fijo") ?? "fijo", message: r?.message ?? "", active: r?.active ?? true, source: r?.source ?? "",
  };
}
function toPayload(d: Draft) {
  return {
    name: d.name, kind: d.kind, familyId: d.scope === "familia" ? d.familyId : null, modelId: d.scope === "producto" ? d.modelId : null,
    conditions: d.conditions.filter((k) => k.attributeId && k.valueIds.length), targetAttributeId: ["bloquear", "permitir"].includes(d.kind) ? d.targetAttributeId : null,
    targetValueIds: ["bloquear", "permitir"].includes(d.kind) ? d.targetValueIds : [],
    minWidth: d.kind === "medidas" ? num(d.minWidth) : null, maxWidth: d.kind === "medidas" ? num(d.maxWidth) : null,
    minHeight: d.kind === "medidas" ? num(d.minHeight) : null, maxHeight: d.kind === "medidas" ? num(d.maxHeight) : null,
    surcharge: d.kind === "recargo" ? Number(d.surcharge.replace(",", ".")) || 0 : 0, surchargeKind: d.surchargeKind, message: d.message, active: d.active, source: d.source,
  };
}

async function api(method: string, id: number | undefined, body?: unknown) {
  const res = await fetch(`/api/admin/constraints${id ? `/${id}` : ""}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(Object.values(data.fields ?? {})[0] as string ?? data.error ?? "No se pudo guardar.");
  return data as ConstraintRule;
}

export function RulesStudio({ catalog, initialRules }: { catalog: CatalogData; initialRules: ConstraintRule[] }) {
  const router = useRouter();
  const [rules, setRules] = useState(initialRules);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const cat = useMemo(() => ({ ...catalog, constraints: rules }), [catalog, rules]);
  const [conflicts, setConflicts] = useState(() => findConflicts({ ...catalog, constraints: initialRules }));
  const attrs = catalog.attributes;
  const vals = (attrId: number | null) => (attrId ? valuesFor(catalog, attrId) : []);
  const after = (next: ConstraintRule[]) => { setRules(next); setConflicts(findConflicts({ ...catalog, constraints: next })); router.refresh(); };

  async function save() {
    if (!draft) return;
    setSaving(true); setError(null);
    try {
      const row = await api(draft.id ? "PATCH" : "POST", draft.id, toPayload(draft));
      after(draft.id ? rules.map((r) => (r.id === row.id ? row : r)) : [...rules, row]);
      setDraft(null);
    } catch (e) { setError((e as Error).message); }
    setSaving(false);
  }
  async function toggle(r: ConstraintRule) {
    const row = await api("PATCH", r.id, toPayload({ ...toDraft(r), active: !r.active }));
    after(rules.map((x) => (x.id === row.id ? row : x)));
  }
  async function remove(r: ConstraintRule) {
    if (!confirm(`¿Eliminar la regla “${r.name}”?`)) return;
    await fetch(`/api/admin/constraints/${r.id}`, { method: "DELETE" });
    after(rules.filter((x) => x.id !== r.id));
  }

  const preview = draft ? ruleSentence(cat, { ...(toPayload(draft) as unknown as ConstraintRule), id: 0, ifOption: null, thenOption: null }) : "";
  const setCond = (i: number, k: Partial<RuleCondition>) => draft && setDraft({ ...draft, conditions: draft.conditions.map((c, j) => (j === i ? { ...c, ...k } : c)) });
  const toggleIn = (list: number[], id: number) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  return (
    <div className="space-y-14">
      <section data-testid="rules-list">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
          <div>
            <h1 className="font-serif text-3xl">5 · Reglas</h1>
            <p className="mt-1 text-sm text-muted">Cada regla se lee como una frase: dónde, si se cumple, qué pasa.</p>
          </div>
          <button onClick={() => { setError(null); setDraft(toDraft()); }} className="bg-ink px-4 py-2 text-sm text-paper hover:bg-ink/85">Añadir regla</button>
        </div>
        {conflicts.length > 0 && (
          <div className="mt-4 border border-danger/40 bg-danger/[0.04] p-3 text-sm" data-testid="rule-conflicts">
            <p className="text-danger">Atención: {conflicts.length === 1 ? "una combinación deja" : `${conflicts.length} combinaciones dejan`} un atributo obligatorio sin opciones.</p>
            <ul className="mt-1 list-disc pl-5 text-muted">
              {conflicts.slice(0, 6).map((c, i) => <li key={i}>{c.model}: con {c.when}, no queda ninguna opción de {c.attribute}.</li>)}
            </ul>
          </div>
        )}
        <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_420px]">
          <ul className="divide-y divide-line border-y border-line">
            {rules.map((r) => (
              <li key={r.id} className={`flex flex-wrap items-start gap-3 py-3 ${r.active ? "" : "opacity-50"}`} data-testid="rule-row">
                <label className="mt-0.5 inline-flex cursor-pointer items-center" title={r.active ? "Activa" : "Desactivada"}>
                  <input type="checkbox" role="switch" className="peer sr-only" checked={r.active} onChange={() => toggle(r)} aria-label={`Activar ${r.name}`} />
                  <span className="relative h-4 w-7 rounded-full bg-line transition peer-checked:bg-accent after:absolute after:left-0.5 after:top-0.5 after:size-3 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-3" />
                </label>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{r.name}{r.source && <span className="ml-2 font-mono text-[11px] text-muted">matriz</span>}</p>
                  <p className="text-sm text-muted" data-testid="rule-sentence">{ruleSentence(cat, r)}</p>
                  {r.message && <p className="text-xs text-muted">Mensaje: “{r.message}”</p>}
                </div>
                <button onClick={() => { setError(null); setDraft(toDraft(r)); }} className="text-sm underline underline-offset-4">Editar</button>
                <button onClick={() => remove(r)} className="text-sm text-muted hover:text-danger">Eliminar</button>
              </li>
            ))}
            {rules.length === 0 && <li className="py-6 text-sm text-muted">Todavía no hay reglas.</li>}
          </ul>

          {draft && (
            <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4 self-start border-t border-ink pt-4 text-sm lg:sticky lg:top-8" data-testid="rule-builder">
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Nombre de la regla" aria-label="Nombre de la regla" className={`${sel} w-full font-serif text-lg`} />
              <p className="flex flex-wrap items-center gap-2">
                <span>En</span>
                <select className={sel} value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value as Draft["scope"] })} aria-label="Ámbito">
                  <option value="todas">todos los productos</option><option value="familia">la categoría</option><option value="producto">el producto</option>
                </select>
                {draft.scope === "familia" && <select className={sel} value={draft.familyId ?? ""} onChange={(e) => setDraft({ ...draft, familyId: Number(e.target.value) || null })} aria-label="Categoría"><option value="">Elija…</option>{catalog.families?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>}
                {draft.scope === "producto" && <select className={sel} value={draft.modelId ?? ""} onChange={(e) => setDraft({ ...draft, modelId: Number(e.target.value) || null })} aria-label="Producto"><option value="">Elija…</option>{catalog.models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>}
              </p>
              {draft.conditions.map((k, i) => (
                <div key={i} className="space-y-1.5" data-testid="rule-condition">
                  <p className="flex flex-wrap items-center gap-2">
                    <span>{i ? "y" : "si"}</span>
                    <select className={sel} value={k.attributeId || ""} onChange={(e) => setCond(i, { attributeId: Number(e.target.value), valueIds: [] })} aria-label={`Atributo condición ${i + 1}`}>
                      <option value="">Atributo…</option>{attrs.filter((a) => a.kind !== "numero").map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <span>{k.valueIds.length > 1 ? "es uno de" : "es"}</span>
                    <button type="button" className="ml-auto text-xs text-muted hover:text-danger" onClick={() => setDraft({ ...draft, conditions: draft.conditions.filter((_, j) => j !== i) })}>Quitar</button>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {vals(k.attributeId).map((v) => <button type="button" key={v.id} className={chip(k.valueIds.includes(v.id))} onClick={() => setCond(i, { valueIds: toggleIn(k.valueIds, v.id) })}>{v.name}</button>)}
                  </div>
                </div>
              ))}
              <button type="button" className="text-xs underline underline-offset-4" onClick={() => setDraft({ ...draft, conditions: [...draft.conditions, { attributeId: 0, valueIds: [] }] })}>
                + {draft.conditions.length ? "Y otra condición" : "Añadir condición"}
              </button>
              <div className="space-y-1.5 border-t border-line pt-3">
                <p className="flex flex-wrap items-center gap-2">
                  <span>entonces</span>
                  <select className={sel} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as RuleEffect })} aria-label="Efecto">
                    {Object.entries(RULE_EFFECTS).map(([k, l]) => <option key={k} value={k}>{l.toLowerCase()}</option>)}
                  </select>
                  {(draft.kind === "bloquear" || draft.kind === "permitir") && (
                    <select className={sel} value={draft.targetAttributeId ?? ""} onChange={(e) => setDraft({ ...draft, targetAttributeId: Number(e.target.value) || null, targetValueIds: [] })} aria-label="Atributo afectado">
                      <option value="">Atributo…</option>{attrs.filter((a) => a.kind === "lista" || a.kind === "color").map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  )}
                </p>
                {(draft.kind === "bloquear" || draft.kind === "permitir") && (
                  <div className="flex flex-wrap gap-1.5" data-testid="rule-targets">
                    {vals(draft.targetAttributeId).map((v) => <button type="button" key={v.id} className={chip(draft.targetValueIds.includes(v.id))} onClick={() => setDraft({ ...draft, targetValueIds: toggleIn(draft.targetValueIds, v.id) })}>{v.name}</button>)}
                  </div>
                )}
                {draft.kind === "medidas" && (
                  <div className="grid grid-cols-2 gap-3">
                    {([["minWidth", "Ancho mín. (cm)"], ["maxWidth", "Ancho máx. (cm)"], ["minHeight", "Alto mín. (cm)"], ["maxHeight", "Alto máx. (cm)"]] as const).map(([k, l]) => (
                      <label key={k}><span className="block text-xs text-muted">{l}</span><input className={`${sel} w-full font-mono`} inputMode="numeric" value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value.replace(/\D/g, "") })} aria-label={l} /></label>
                    ))}
                  </div>
                )}
                {draft.kind === "recargo" && (
                  <p className="flex items-center gap-2">S/ <input className={`${sel} w-20 font-mono`} value={draft.surcharge} onChange={(e) => setDraft({ ...draft, surcharge: e.target.value })} aria-label="Importe" />
                    <select className={sel} value={draft.surchargeKind} onChange={(e) => setDraft({ ...draft, surchargeKind: e.target.value as "fijo" })} aria-label="Recargo por"><option value="fijo">por unidad</option><option value="por_m2">por m²</option></select>
                  </p>
                )}
              </div>
              <label className="block"><span className="block text-xs text-muted">Mensaje para el cliente</span>
                <input className={`${sel} w-full`} value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} placeholder="Ej.: Con soporte a techo, elija motor." aria-label="Mensaje para el cliente" />
              </label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" className="accent-ink" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Activa</label>
              <p className="border-l-2 border-accent pl-3 text-muted" data-testid="rule-preview">{preview}</p>
              {error && <p className="text-danger">{error}</p>}
              <div className="flex gap-4">
                <button disabled={saving} className="bg-ink px-4 py-2 text-paper disabled:opacity-50">{saving ? "Guardando…" : "Guardar"}</button>
                <button type="button" onClick={() => setDraft(null)} className="text-muted underline underline-offset-4">Cancelar</button>
              </div>
            </form>
          )}
        </div>
      </section>

      <Matrix catalog={cat} rules={rules} onSaved={after} />
      <Tester catalog={cat} />
    </div>
  );
}

/** Matriz de compatibilidad: dos atributos de una categoría; desmarcar = bloquear la combinación. */
function Matrix({ catalog, rules, onSaved }: { catalog: CatalogData; rules: ConstraintRule[]; onSaved: (r: ConstraintRule[]) => void }) {
  const families = catalog.families ?? [];
  const [familyId, setFamilyId] = useState(families[0]?.id ?? 0);
  const family = families.find((f) => f.id === familyId);
  const fas = (family?.attributes ?? []).map((fa) => ({ ...fa, attribute: catalog.attributes.find((a) => a.id === fa.attributeId)! })).filter((x) => x.attribute && (x.attribute.kind === "lista" || x.attribute.kind === "color"));
  const [aId, setA] = useState<number>(fas[0]?.attributeId ?? 0);
  const [bId, setB] = useState<number>(fas[1]?.attributeId ?? 0);
  const fa = fas.find((x) => x.attributeId === aId), fb = fas.find((x) => x.attributeId === bId);
  const source = `matriz:${familyId}:${aId}:${bId}`;
  const mine = rules.filter((r) => r.source === source);
  const blockedFrom = () => new Set(mine.flatMap((r) => (r.targetValueIds ?? []).map((b) => `${r.conditions[0]?.valueIds[0]}:${b}`)));
  const [blocked, setBlocked] = useState<Set<string>>(blockedFrom);
  const [key, setKey] = useState(source);
  if (key !== source) { setKey(source); setBlocked(blockedFrom()); }
  const [msg, setMsg] = useState<string | null>(null);
  const av = fa ? valuesFor(catalog, aId, undefined, fa.valueIds) : [];
  const bv = fb ? valuesFor(catalog, bId, undefined, fb.valueIds) : [];

  async function save() {
    setMsg(null);
    for (const r of mine) await fetch(`/api/admin/constraints/${r.id}`, { method: "DELETE" });
    const created: ConstraintRule[] = [];
    for (const a of av) {
      const ids = bv.filter((b) => blocked.has(`${a.id}:${b.id}`)).map((b) => b.id);
      if (!ids.length) continue;
      created.push(await api("POST", undefined, {
        name: `Compatibilidad ${family?.name}: ${fa!.attribute.name} ${a.name}`, kind: "bloquear", familyId, modelId: null,
        conditions: [{ attributeId: aId, valueIds: [a.id] }], targetAttributeId: bId, targetValueIds: ids, message: "", active: true, source,
      }));
    }
    onSaved([...rules.filter((r) => r.source !== source), ...created]);
    setMsg(`Guardado: ${created.length} ${created.length === 1 ? "regla" : "reglas"} de bloqueo.`);
  }

  return (
    <section data-testid="compat-matrix">
      <h2 className="border-b border-line pb-3 font-serif text-2xl">Matriz de compatibilidad</h2>
      <p className="mt-2 text-sm text-muted">Desmarque las combinaciones que no se fabrican.</p>
      <div className="mt-4 flex flex-wrap items-end gap-4 text-sm">
        <select className={sel} value={familyId} onChange={(e) => { const id = Number(e.target.value); setFamilyId(id); const f = families.find((x) => x.id === id); setA(f?.attributes[0]?.attributeId ?? 0); setB(f?.attributes[1]?.attributeId ?? 0); }} aria-label="Categoría de la matriz">
          {families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select className={sel} value={aId} onChange={(e) => setA(Number(e.target.value))} aria-label="Filas">{fas.map((x) => <option key={x.attributeId} value={x.attributeId}>{x.attribute.name}</option>)}</select>
        <span className="text-muted">×</span>
        <select className={sel} value={bId} onChange={(e) => setB(Number(e.target.value))} aria-label="Columnas">{fas.filter((x) => x.attributeId !== aId).map((x) => <option key={x.attributeId} value={x.attributeId}>{x.attribute.name}</option>)}</select>
      </div>
      {fa && fb && aId !== bId ? (
        <div className="mt-4 overflow-x-auto">
          <table className="text-sm">
            <thead><tr><th />{bv.map((b) => <th key={b.id} className="px-3 py-2 text-left font-normal text-muted">{b.name}</th>)}</tr></thead>
            <tbody>
              {av.map((a) => (
                <tr key={a.id} className="border-t border-line">
                  <td className="py-2 pr-4">{a.name}{a.code ? <span className="ml-1 font-mono text-[11px] text-muted">{a.code}</span> : null}</td>
                  {bv.map((b) => {
                    const k = `${a.id}:${b.id}`, ok = !blocked.has(k);
                    return (
                      <td key={b.id} className="px-3 py-2 text-center">
                        <input type="checkbox" className="accent-ink" checked={ok} aria-label={`${a.name} con ${b.name}`}
                          onChange={() => setBlocked((s) => { const n = new Set(s); if (ok) n.add(k); else n.delete(k); return n; })} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex items-center gap-4">
            <button type="button" onClick={save} className="bg-ink px-4 py-2 text-sm text-paper" data-testid="matrix-save">Guardar matriz</button>
            {msg && <span className="text-sm text-muted">{msg}</span>}
          </div>
        </div>
      ) : <p className="mt-4 text-sm text-muted">Elija dos atributos distintos.</p>}
    </section>
  );
}

/** Probador: elija producto y valores; muestra qué opciones quedan y qué regla bloquea cada una. */
function Tester({ catalog }: { catalog: CatalogData }) {
  const [modelId, setModelId] = useState(catalog.models[0]?.id ?? 0);
  const [values, setValues] = useState<Values>({});
  const model = catalog.models.find((m) => m.id === modelId);
  const ev = evaluate(catalog, { modelId, values });
  const fas = model ? familyAttributes(catalog, model) : [];
  return (
    <section data-testid="rule-tester">
      <h2 className="border-b border-line pb-3 font-serif text-2xl">Probar reglas</h2>
      <p className="mt-2 text-sm text-muted">Elija un producto y algunos valores; vea qué queda disponible.</p>
      <div className="mt-4 grid gap-8 lg:grid-cols-[320px_1fr]">
        <div className="space-y-3 text-sm">
          <label className="block"><span className="block text-xs text-muted">Producto</span>
            <select className={`${sel} w-full`} value={modelId} onChange={(e) => { setModelId(Number(e.target.value)); setValues({}); }} aria-label="Producto a probar">
              {catalog.models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          {fas.filter((f) => f.attribute.kind !== "numero").map((f) => (
            <label key={f.attributeId} className="block"><span className="block text-xs text-muted">{f.attribute.name}</span>
              {f.attribute.kind === "sino" ? (
                <input type="checkbox" className="accent-ink" checked={values[f.attributeId] === true} onChange={(e) => setValues({ ...values, [f.attributeId]: e.target.checked })} aria-label={`Probar ${f.attribute.name}`} />
              ) : (
                <select className={`${sel} w-full`} value={typeof values[f.attributeId] === "number" ? (values[f.attributeId] as number) : ""} aria-label={`Probar ${f.attribute.name}`}
                  onChange={(e) => setValues({ ...values, [f.attributeId]: Number(e.target.value) || null })}>
                  <option value="">— sin elegir —</option>
                  {valuesFor(catalog, f.attributeId, model, f.valueIds).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              )}
            </label>
          ))}
        </div>
        <div className="space-y-4 text-sm" data-testid="tester-result">
          <p className="font-mono text-xs text-muted">Medidas: ancho {ev.limits.minWidth}–{ev.limits.maxWidth} cm · alto {ev.limits.minHeight}–{ev.limits.maxHeight} cm</p>
          {ev.fields.filter((f) => f.kind !== "numero" && f.kind !== "sino").map((f) => (
            <div key={f.attribute.id}>
              <p className="text-xs text-muted">{f.attribute.name} · {f.choices.filter((c) => !c.disabled).length} de {f.choices.length} disponibles</p>
              <ul className="mt-1 grid gap-x-6 sm:grid-cols-2">
                {f.choices.map((c) => (
                  <li key={c.value} className={c.disabled ? "text-muted" : ""}>
                    <span className={c.disabled ? "text-danger" : "text-accent"}>{c.disabled ? "✕" : "✓"}</span> {c.label}
                    {c.rule && <span className="block pl-4 text-xs">por “{c.rule}”</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
