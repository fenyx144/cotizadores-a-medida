"use client";
/**
 * Asistente paso a paso: una pregunta por pantalla (categoría → producto → atributos → medidas →
 * ubicación → resumen). Aplica las reglas en vivo y agrega la línea al proyecto del cliente.
 */
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { addFromWizard } from "@/app/actions/project";
import { GuidePanel } from "./GuidePanel";
import { stepsToAsk } from "@/lib/guide";
import type { CatalogData } from "@/lib/line-price";
import { MATERIAL_ATTR, evaluate, matchVariant, productMaterials, variantFixed, variantGroups, variantValues, variantsFor, type Values } from "@/lib/rules";

type Step = { key: string; title: string };
interface Props {
  catalog: CatalogData; projects: { id: number; name: string }[]; loggedIn: boolean;
  initial?: { familyId?: number; modelId?: number; projectId?: number };
}
const big = (on: boolean, off?: boolean) =>
  `w-full border px-4 py-3 text-left transition ${off ? "cursor-not-allowed border-line text-muted opacity-60" : on ? "border-accent bg-white ring-1 ring-accent" : "border-line bg-white hover:border-ink"}`;
const field = "w-full border-b border-line bg-transparent py-2 text-lg outline-none focus:border-ink";

export function ConfigWizard({ catalog, projects, loggedIn, initial }: Props) {
  const startModel = catalog.models.find((m) => m.id === initial?.modelId);
  const [familyId, setFamilyId] = useState<number | null>(startModel?.familyId ?? initial?.familyId ?? null);
  const [modelId, setModelId] = useState<number | null>(startModel?.id ?? null);
  const [material, setMaterial] = useState("");
  const [guided, setGuided] = useState(false);
  const [transition, setTransition] = useState<string | null>(null);
  // Atributos ya respondidos en "Ayúdame a elegir": no se vuelven a preguntar (se cambian desde el resumen).
  const [answered, setAnswered] = useState<number[]>([]);
  const [jumpTo, setJumpTo] = useState<string | null>(null);
  const [values, setValues] = useState<Values>({});
  // Variante elegida en el asistente: fija sus atributos (esos pasos se saltan). null = libre; undefined = sin decidir.
  const [variantId, setVariantId] = useState<number | null | undefined>(undefined);
  const [dims, setDims] = useState({ width: "", height: "", quantity: "1" });
  const [place, setPlace] = useState({ room: "", note: "" });
  const [projectId, setProjectId] = useState<number | 0>(initial?.projectId ?? projects[0]?.id ?? 0);
  const [newName, setNewName] = useState("");
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const model = catalog.models.find((m) => m.id === modelId);
  const w = Number(dims.width) || null, h = Number(dims.height) || null;
  const ev = model ? evaluate(catalog, { modelId: model.id, values, width: w, height: h, variantId: variantId ?? null }) : null;
  const fields = ev?.fields ?? [];
  const variants = model ? variantsFor(catalog, model.id) : [];
  const chosenVariant = variants.find((v) => v.id === variantId);
  const locked = chosenVariant ? Object.keys(variantFixed(catalog, chosenVariant)).map(Number) : [];
  const steps: Step[] = [
    { key: "categoria", title: "¿Qué tipo de cortina busca?" },
    { key: "producto", title: "Elija el producto" },
    ...(variants.length ? [{ key: "variante", title: "¿Usar una variante?" }] : []),
    ...stepsToAsk(fields, locked, answered).map((f) => ({ key: `a${f.attribute.id}`, title: f.attribute.name })),
    { key: "medidas", title: "Medidas y cantidad" },
    { key: "ubicacion", title: "¿Dónde va?" },
    { key: "resumen", title: "Resumen" },
  ];
  const [i, setI] = useState(startModel ? 2 : initial?.familyId ? 1 : 0);
  const step = steps[Math.min(i, steps.length - 1)];
  // Progreso estable: 6 fases fijas; las opciones (variante y atributos) cuentan como una sola.
  const PHASES = ["categoria", "producto", "opciones", "medidas", "ubicacion", "resumen"];
  const isOption = step.key === "variante" || step.key.startsWith("a");
  const phase = isOption ? 2 : PHASES.indexOf(step.key);
  const optSteps = steps.filter((x) => x.key === "variante" || x.key.startsWith("a"));
  const optIndex = optSteps.findIndex((x) => x.key === step.key);
  const currentVariant = model ? matchVariant(catalog, { modelId: model.id, values }) : undefined;
  const go = (d: number) => { setError(null); setI((x) => Math.max(0, Math.min(steps.length - 1, x + d))); };

  const families = (catalog.families ?? []).filter((f) => catalog.models.some((m) => m.familyId === f.id));
  const inFamily = catalog.models.filter((m) => m.familyId === familyId);
  const famMats = inFamily.flatMap((m) => productMaterials(catalog, m).map((x) => x.slug)).filter((x, k, a) => a.indexOf(x) === k);
  const allowed = (catalog.families?.find((f) => f.id === familyId)?.materials ?? "").split(",").filter(Boolean);
  const matOptions = (catalog.materials ?? []).filter((m) => (allowed.length ? allowed.includes(m.slug) : famMats.includes(m.slug)) && famMats.includes(m.slug));
  const attr = fields.find((f) => `a${f.attribute.id}` === step.key);
  const dimErr = ev?.errors.width ?? ev?.errors.height ?? (Number(dims.quantity) < 1 ? "Indique la cantidad." : undefined);
  const attrErr = attr ? ev?.errors[attr.attribute.id] : undefined;
  const canNext =
    step.key === "categoria" ? !!familyId : step.key === "producto" ? !!model : step.key === "variante" ? variantId !== undefined :
    attr ? !attrErr && (!attr.required || attr.kind === "sino" || values[attr.attribute.id] != null) :
    step.key === "medidas" ? !!w && !!h && !dimErr : true;

  async function add() {
    if (!model) return;
    setPending(true); setError(null);
    const res = await addFromWizard({ projectId: projectId || null, newProjectName: newName, modelId: model.id, values, width: w!, height: h!, quantity: Number(dims.quantity) || 1, room: place.room, note: place.note });
    setPending(false);
    if (res.ok) { setDone(res.projectId); setProjectId(res.projectId); } else setError(res.error);
  }
  function again() {
    setDone(null); setAnswered([]); setModelId(null); setValues({}); setVariantId(undefined); setDims({ width: "", height: "", quantity: "1" }); setPlace({ room: place.room, note: "" }); setI(familyId ? 1 : 0);
  }

  useEffect(() => {
    if (!jumpTo) return;
    const k = steps.findIndex((x) => x.key === jumpTo);
    if (k >= 0) { setI(k); setJumpTo(null); }
  }, [jumpTo, steps]);
  /** Cambiar desde el resumen un atributo respondido en la guía o fijado por la variante. */
  const editAttr = (id: number) => {
    setAnswered((a) => a.filter((x) => x !== id));
    if (locked.includes(id)) setVariantId(null);
    setJumpTo(`a${id}`);
  };

  const valueName = (id: number) => catalog.values.find((v) => v.id === id)?.name ?? "";
  const summary = fields.map((f) => {
    const v = values[f.attribute.id];
    return [f.attribute.name, (v == null || v === false ? "—" : v === true ? "Sí" : f.kind === "numero" ? `${v} ${f.attribute.unit}` : f.attribute.id === MATERIAL_ATTR ? catalog.materials?.find((m) => m.id === v)?.name ?? "" : valueName(v as number)), f.attribute.id] as const;
  });

  if (done) {
    return (
      <div className="mx-auto max-w-xl py-10 text-center" data-testid="wizard-done">
        <p className="font-serif text-3xl">Agregado a la tabla</p>
        <p className="mt-2 text-muted">{model?.name} · {w} × {h} cm · {dims.quantity} ud.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button onClick={again} className="bg-ink px-5 py-3 text-paper">Configurar otra</button>
          <Link href={`/proyecto/${done}`} className="border border-ink px-5 py-3">Ver la tabla</Link>
        </div>
      </div>
    );
  }

  if (transition) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center" data-testid="wizard-transition" onClick={() => setTransition(null)}>
        <p className="font-mono text-xs text-accent">✓ {transition}</p>
        <p className="mt-4 font-serif text-[2.2rem] leading-tight">Ahora elige las especificaciones de {transition}</p>
        <div className="mx-auto mt-8 h-0.5 w-40 overflow-hidden bg-line"><div className="h-full animate-[grow_1.8s_linear_forwards] bg-accent" style={{ width: 0 }} /></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl" data-testid="wizard">
      <div className="flex items-center justify-between font-mono text-xs text-muted">
        <span data-testid="wizard-progress">Paso {phase + 1} de {PHASES.length}{isOption ? " · Opciones" : ""}</span>
        {i > 0 && <button onClick={() => go(-1)} className="hover:text-ink">← Atrás</button>}
      </div>
      <div className="mt-2 h-0.5 bg-line"><div className="h-full bg-accent transition-all" style={{ width: `${((phase + (isOption ? (optIndex + 1) / (optSteps.length + 1) : 1)) / PHASES.length) * 100}%` }} /></div>
      {attr?.group && <p className="mt-8 font-mono text-xs uppercase tracking-wide text-muted" data-testid="wizard-group">{attr.group}</p>}
      <h1 className={`${attr?.group ? "mt-1" : "mt-8"} font-serif text-[2.2rem] leading-tight`} data-testid="wizard-title">{step.title}{attr && !attr.required ? <span className="ml-2 font-sans text-sm text-muted">opcional</span> : null}</h1>

      <div className="mt-6 space-y-2">
        {step.key === "categoria" && !guided && families.map((f) => {
          const img = catalog.models.find((m) => m.familyId === f.id)?.image;
          return (
            <button key={f.id} className={`${big(familyId === f.id)} flex items-center gap-4`} onClick={() => { setAnswered([]); if (familyId !== f.id) { setModelId(null); setMaterial(""); setValues({}); setVariantId(undefined); } setFamilyId(f.id); go(1); }}>
              {img && <span className="relative size-14 shrink-0 overflow-hidden bg-paper-deep"><Image src={img} alt="" fill sizes="56px" className="object-cover" /></span>}
              <span><span className="block text-lg">{f.name}</span>{f.description && <span className="block text-sm text-muted">{f.description}</span>}</span>
            </button>
          );
        })}

        {(step.key === "producto" || step.key === "categoria") && guided && (
          <GuidePanel catalog={catalog} familyId={step.key === "producto" ? familyId : null} onCancel={() => setGuided(false)}
            onPick={(id, pre, v) => {
              const m = catalog.models.find((x) => x.id === id)!;
              setFamilyId(m.familyId); setModelId(id); setMaterial("");
              if (v) { setVariantId(v.id); setValues({ ...pre, ...variantValues(catalog, v) }); } else { setVariantId(undefined); setValues(pre); }
              setAnswered(Object.keys(pre).map(Number));
              setGuided(false); setError(null); setI(v ? 3 : 2);
              setTransition(m.name); setTimeout(() => setTransition(null), 1800);
            }} />
        )}
        {step.key === "categoria" && !guided && <button className={`${big(false)} border-dashed`} data-testid="wizard-guide-all" onClick={() => setGuided(true)}>No sé qué modelo, ayúdame a elegir</button>}
        {step.key === "producto" && !guided && (
          <>
            {inFamily.length > 1 && <button className={`${big(false)} border-dashed`} data-testid="wizard-guide" onClick={() => setGuided(true)}>No sé qué modelo, ayúdame a elegir</button>}
            {matOptions.length > 1 && (
              <div className="mb-3 flex flex-wrap gap-2 text-sm" data-testid="wizard-material">
                {[{ slug: "", name: "Todos" }, ...matOptions].map((m) => (
                  <button key={m.slug} onClick={() => setMaterial(m.slug)} className={`border px-3 py-1 ${material === m.slug ? "border-ink bg-ink text-paper" : "border-line"}`}>{m.name}</button>
                ))}
              </div>
            )}
            {inFamily.filter((m) => !material || productMaterials(catalog, m).some((x) => x.slug === material)).map((m) => (
              <button key={m.id} className={`${big(modelId === m.id)} flex items-center gap-4`} onClick={() => { if (modelId !== m.id) { setValues({}); setVariantId(undefined); } setAnswered([]); setModelId(m.id); go(1); setTransition(m.name); setTimeout(() => setTransition(null), 1800); }}>
                {m.image && <span className="relative size-14 shrink-0 overflow-hidden bg-paper-deep"><Image src={m.image} alt="" fill sizes="56px" className="object-cover" /></span>}
                <span><span className="block text-lg">{m.name}</span><span className="block text-sm text-muted">{productMaterials(catalog, m).map((x) => x.name).join(" · ")} · {m.tagline}</span></span>
              </button>
            ))}
          </>
        )}

        {step.key === "variante" && (
          <>
            {variants.map((v) => {
              const fixed = [...variantGroups(catalog, v).values()].map((g) => g.map((x) => catalog.values.find((y) => y.id === x)?.name).filter(Boolean).join(" o ")).filter(Boolean).join(" · ");
              return (
                <button key={v.id} className={big(variantId === v.id)} data-testid="wizard-variant" onClick={() => { setVariantId(v.id); setValues({ ...values, ...variantValues(catalog, v) }); go(1); }}>
                  <span className="block"><span className="font-mono text-sm">{v.code}</span> · {v.name}</span>
                  {fixed && <span className="block text-sm text-muted">{fixed}</span>}
                </button>
              );
            })}
            <button className={big(variantId === null)} onClick={() => { if (chosenVariant) setValues({}); setVariantId(null); go(1); }} data-testid="wizard-free">Configurar libremente</button>
          </>
        )}

        {attr && (attr.kind === "sino" ? (
          [true, false].map((b) => {
            const why = b ? attr.choices[0]?.disabled : undefined;
            return (
              <button key={String(b)} disabled={!!why} className={big((values[attr.attribute.id] === true) === b, !!why)} onClick={() => { setValues({ ...values, [attr.attribute.id]: b }); go(1); }}>
                {b ? "Sí" : "No"}{why && <span className="block text-xs">{why}</span>}
              </button>
            );
          })
        ) : attr.kind === "numero" ? (
          <input className={field} inputMode="decimal" autoFocus value={typeof values[attr.attribute.id] === "number" ? String(values[attr.attribute.id]) : ""} aria-label={attr.attribute.name}
            onChange={(e) => setValues({ ...values, [attr.attribute.id]: e.target.value === "" ? null : Number(e.target.value.replace(",", ".")) })} placeholder={attr.attribute.unit} />
        ) : (
          <>
            {attr.choices.map((c) => (
              <button key={c.value} disabled={!!c.disabled} className={`${big(values[attr.attribute.id] === c.value, !!c.disabled)} flex items-center gap-3`} data-testid="wizard-choice"
                onClick={() => { setValues({ ...values, [attr.attribute.id]: c.value }); go(1); }}>
                {c.image ? <img src={c.image} alt="" className="size-10 shrink-0 border border-line object-cover" /> : c.hex && <span className="size-6 shrink-0 rounded-full border border-line" style={{ background: c.hex }} />}
                <span><span className="block">{c.label}</span>{c.disabled && <span className="block text-xs" data-testid="wizard-reason">No disponible: {c.disabled}</span>}</span>
              </button>
            ))}
            {!attr.required && <button className={big(values[attr.attribute.id] == null)} onClick={() => { setValues({ ...values, [attr.attribute.id]: null }); go(1); }}>Sin preferencia</button>}
          </>
        ))}
        {attrErr && <p className="text-sm text-danger">{attrErr}</p>}

        {step.key === "medidas" && ev && (
          <div className="space-y-6">
            {([["width", "Ancho", ev.limits.minWidth, ev.limits.maxWidth], ["height", "Alto", ev.limits.minHeight, ev.limits.maxHeight]] as const).map(([k, l, min, max]) => (
              <label key={k} className="block">
                <span className="flex justify-between text-sm text-muted">{l} (cm)<span className="font-mono" data-testid={`wizard-range-${k}`}>{min}–{max}</span></span>
                <input className={`${field} font-mono`} inputMode="numeric" value={dims[k]} onChange={(e) => setDims({ ...dims, [k]: e.target.value.replace(/\D/g, "") })} aria-label={l} />
              </label>
            ))}
            <label className="block"><span className="text-sm text-muted">Cantidad</span>
              <input className={`${field} font-mono`} inputMode="numeric" value={dims.quantity} onChange={(e) => setDims({ ...dims, quantity: e.target.value.replace(/\D/g, "") })} aria-label="Cantidad" />
            </label>
            {w && h && dimErr && <p className="text-sm text-danger" data-testid="wizard-dim-error">{dimErr}</p>}
          </div>
        )}

        {step.key === "ubicacion" && (
          <div className="space-y-6">
            <label className="block"><span className="text-sm text-muted">Ambiente</span>
              <input className={field} value={place.room} onChange={(e) => setPlace({ ...place, room: e.target.value })} placeholder="Ej.: Aula 101, Dormitorio" aria-label="Ambiente" />
            </label>
            <label className="block"><span className="text-sm text-muted">Nota (opcional)</span>
              <input className={field} value={place.note} onChange={(e) => setPlace({ ...place, note: e.target.value })} aria-label="Nota" />
            </label>
          </div>
        )}

        {step.key === "resumen" && model && (
          <div className="space-y-6" data-testid="wizard-summary">
            <dl className="divide-y divide-line border-y border-line text-sm">
              {([["Producto", model.name], ...(currentVariant ? [["Variante", `${currentVariant.code} · ${currentVariant.name}`]] : []), ...summary, ["Medidas", `${w} × ${h} cm`], ["Cantidad", dims.quantity], ["Ambiente", place.room || "—"], ...(place.note ? [["Nota", place.note]] : [])] as (readonly [string, string, number?])[]).map(([k, v, id]) => (
                <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-muted">{k}</dt>
                  <dd className="text-right">{v}{id != null && (answered.includes(id) || locked.includes(id)) && (
                    <button type="button" className="ml-3 text-xs text-muted underline underline-offset-4 hover:text-ink" onClick={() => editAttr(id)} data-testid="summary-edit">Cambiar</button>
                  )}</dd></div>
              ))}
            </dl>
            {!loggedIn ? (
              <p className="text-muted"><Link href={`/cliente/ingresar?next=/configurar?modelo=${model.id}`} className="text-ink underline underline-offset-4">Ingrese</Link> o <Link href="/cliente/registro" className="text-ink underline underline-offset-4">cree una cuenta</Link> para guardarla.</p>
            ) : (
              <>
                <label className="block"><span className="text-sm text-muted">Proyecto</span>
                  <select className={field} value={projectId} onChange={(e) => setProjectId(Number(e.target.value))} aria-label="Proyecto">
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    <option value={0}>+ Nuevo proyecto</option>
                  </select>
                </label>
                {!projectId && <input className={field} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre del proyecto" aria-label="Nombre del proyecto" />}
                {error && <p className="text-sm text-danger">{error}</p>}
                <div className="flex flex-wrap gap-3">
                  <button disabled={pending} onClick={add} className="bg-accent px-5 py-3 text-white disabled:opacity-50">{pending ? "Agregando…" : "Agregar a la tabla"}</button>
                  <button onClick={again} className="border border-line px-5 py-3">Configurar otra</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {step.key !== "resumen" && step.key !== "categoria" && step.key !== "producto" && step.key !== "variante" && (
        <button disabled={!canNext} onClick={() => go(1)} className="mt-8 w-full bg-ink px-5 py-3 text-paper disabled:opacity-40 sm:w-auto" data-testid="wizard-next">Siguiente →</button>
      )}
    </div>
  );
}
