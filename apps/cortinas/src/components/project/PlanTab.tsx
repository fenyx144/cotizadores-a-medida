"use client";
/**
 * Pestaña "Plano y fotos": visor con anotaciones, lista lateral sincronizada,
 * herramientas de dibujo, calibración de escala y edición de las ventanas.
 */
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { NewAnnotation, PlanTool } from "@portafolio/core/ui/PlanViewer";
import { LINE_STATUS_COLORS, LINE_STATUS_LABELS, LINE_STATUSES, calibrate, suggestSize, type LineStatus } from "@portafolio/core/projects";
import { calibratePlan, createAnnotation, deletePlan } from "@/app/actions/project";
import { LineEditor } from "./LineEditor";
import { PlanUpload } from "./PlanUpload";
import { btnLine, inputCls, labelCls, locName, type EditorContext } from "./shared";

// Leaflet necesita `window`: cargamos el visor solo en el navegador.
const PlanViewer = dynamic(() => import("@portafolio/core/ui/PlanViewer").then((m) => m.PlanViewer), {
  ssr: false,
  loading: () => <div className="grid h-[620px] place-items-center border border-line text-sm text-muted">Cargando visor…</div>,
});

const TOOLS: { key: PlanTool; label: string; hint: string }[] = [
  { key: "pan", label: "Mover", hint: "Arrastre para moverse. Clic en una marca para elegirla; Ctrl + clic para varias." },
  { key: "point", label: "Punto", hint: "Clic sobre cada ventana para numerarla." },
  { key: "rect", label: "Rectángulo", hint: "Arrastre sobre la ventana. Con escala calibrada se sugiere el ancho." },
  { key: "calibrate", label: "Calibrar", hint: "Marque dos puntos de una cota conocida y escriba la distancia real." },
];

export function PlanTab({ ctx, onGoToSummary }: { ctx: EditorContext; onGoToSummary: () => void }) {
  const { data, readOnly } = ctx;
  const [planId, setPlanId] = useState<number | null>(data.plans[0]?.id ?? null);
  const plan = data.plans.find((p) => p.id === planId) ?? data.plans[0];
  const [tool, setTool] = useState<PlanTool>("pan");
  const [selected, setSelected] = useState<number[]>([]);
  const [focusIds, setFocusIds] = useState<number[]>([]);
  const [newLocId, setNewLocId] = useState<number | null>(data.locations[0]?.id ?? null);
  const [calib, setCalib] = useState<{ a: { x: number; y: number }; b: { x: number; y: number } } | null>(null);
  const [meters, setMeters] = useState("");
  const [filter, setFilter] = useState<LineStatus | "todas">("todas");

  const planLines = useMemo(() => data.lines.filter((l) => plan && l.planId === plan.id && l.x != null && l.y != null), [data.lines, plan]);
  const annotations = useMemo(
    () => planLines.map((l) => ({ id: l.id, label: l.label, shape: (l.shape === "rect" ? "rect" : "point") as "rect" | "point", x: l.x!, y: l.y!, w: l.w, h: l.h, color: LINE_STATUS_COLORS[l.status as LineStatus] })),
    [planLines],
  );
  const listed = planLines.filter((l) => filter === "todas" || l.status === filter);
  const selLines = data.lines.filter((l) => selected.includes(l.id));
  const locById = new Map(data.locations.map((l) => [l.id, l]));

  function onSelect(ids: number[], additive: boolean) {
    setSelected((s) => (additive ? (s.includes(ids[0]) ? s.filter((x) => x !== ids[0]) : [...s, ...ids]) : ids));
  }

  async function onCreate(a: NewAnnotation) {
    if (!plan || readOnly) return;
    // Con escala calibrada, el rectángulo sugiere el ancho de la cortina (+10 cm de traslape).
    const size = a.shape === "rect" && plan.metersPerPx ? suggestSize({ w: a.w!, h: a.h! }, plan, plan.metersPerPx) : null;
    const r = await ctx.act(
      createAnnotation(data.project.id, plan.id, { ...a, locationId: newLocId, width: size ? size.width + 10 : null, height: size?.height ?? null }),
    );
    if (r?.createdId) setSelected([r.createdId]);
  }

  async function saveCalibration() {
    if (!plan || !calib) return;
    const mpp = calibrate(calib.a, calib.b, plan, Number(meters.replace(",", ".")));
    if (!mpp) return;
    if (await ctx.act(calibratePlan(data.project.id, plan.id, mpp), "Escala guardada.")) {
      setCalib(null);
      setMeters("");
      setTool("rect");
    }
  }

  if (!plan) {
    return (
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h2 className="text-[2rem] leading-tight">Suba el plano de la obra</h2>
          <p className="mt-2 max-w-lg text-muted">Marque cada ventana con un punto o un rectángulo y configúrela. También puede subir fotos de un ambiente y marcar sobre ellas.</p>
          {!readOnly && <div className="mt-8"><PlanUpload ctx={ctx} onUploaded={setPlanId} /></div>}
        </div>
        <div className="border-t border-line pt-6 lg:col-span-4 lg:col-start-9 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <p className="font-mono text-xs text-muted">¿No tiene plano?</p>
          <ul className="mt-3 space-y-3 text-[0.95rem]">
            <li>Liste las ventanas por ubicación en la primera pestaña.</li>
            <li>Importe un CSV o Excel con las medidas.</li>
            <li>
              <button type="button" onClick={onGoToSummary} className="underline decoration-accent underline-offset-4">Solicite la medición en obra</button>: vamos, medimos y cargamos el proyecto por usted.
            </li>
          </ul>
        </div>
      </div>
    );
  }

  const configuredCount = planLines.filter((l) => l.status === "configurada").length;

  return (
    <div className="space-y-5">
      {/* Selector de lienzo + subida */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {data.plans.map((p) => (
            <button key={p.id} type="button" onClick={() => { setPlanId(p.id); setSelected([]); }} className={p.id === plan.id ? "text-ink underline decoration-accent underline-offset-4" : "text-muted hover:text-ink"}>
              {p.kind === "foto" ? `Foto · ${locName(p.locationId ? locById.get(p.locationId) : null)}` : p.name}
            </button>
          ))}
        </div>
        {!readOnly && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted hover:text-ink">Subir otro plano o foto</summary>
            <div className="mt-3 w-[min(560px,90vw)]"><PlanUpload ctx={ctx} onUploaded={setPlanId} /></div>
          </details>
        )}
      </div>

      {/* Herramientas */}
      {!readOnly && (
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
          <div className="flex border border-line" role="toolbar" aria-label="Herramientas">
            {TOOLS.map((t, i) => (
              <button key={t.key} type="button" onClick={() => { setTool(t.key); setCalib(null); }} aria-pressed={tool === t.key}
                className={`px-3 py-1.5 text-sm ${i ? "border-l border-line" : ""} ${tool === t.key ? "bg-ink text-white-stone" : "hover:bg-white-stone"}`}>
                {t.label}
              </button>
            ))}
          </div>
          {plan.kind === "plano" && (
            <label className="min-w-56">
              <span className={labelCls}>Ubicación de las nuevas marcas</span>
              <select className={inputCls} value={newLocId ?? ""} onChange={(e) => setNewLocId(Number(e.target.value) || null)}>
                <option value="">Sin ubicación</option>
                {data.locations.map((l) => <option key={l.id} value={l.id}>{locName(l)}</option>)}
              </select>
            </label>
          )}
          <p className="font-mono text-xs text-muted">
            Escala: {plan.metersPerPx ? `1 m = ${Math.round(1 / plan.metersPerPx)} px` : "sin calibrar"}
          </p>
          <p className="basis-full text-xs text-muted">{TOOLS.find((t) => t.key === tool)?.hint}</p>
        </div>
      )}

      {calib && (
        <div className="flex flex-wrap items-end gap-4 border border-line bg-white-stone p-4">
          <label>
            <span className={labelCls}>Distancia real entre los dos puntos (m)</span>
            <input autoFocus className={`${inputCls} w-40 font-mono`} value={meters} onChange={(e) => setMeters(e.target.value)} placeholder="9,00" data-testid="calib-meters" />
          </label>
          <button type="button" className={btnLine} onClick={saveCalibration} disabled={!Number(meters.replace(",", "."))}>Guardar escala</button>
          <button type="button" className="text-sm text-muted" onClick={() => setCalib(null)}>Cancelar</button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <PlanViewer
            imageUrl={`/api/planos/${plan.id}`}
            width={plan.width}
            height={plan.height}
            annotations={annotations}
            selectedIds={selected}
            focusIds={focusIds}
            tool={readOnly ? "pan" : tool}
            onCreate={onCreate}
            onSelect={onSelect}
            onCalibrate={(a, b) => setCalib({ a, b })}
            className="h-[620px]"
          />
          <div className="mt-2 flex flex-wrap justify-between gap-2 font-mono text-xs text-muted">
            <span>
              {LINE_STATUSES.map((s) => (
                <span key={s} className="mr-5"><i className="mr-1.5 inline-block size-2 align-middle" style={{ background: LINE_STATUS_COLORS[s] }} />{LINE_STATUS_LABELS[s]}</span>
              ))}
            </span>
            <span>{configuredCount} de {planLines.length} configuradas</span>
          </div>
          {!readOnly && (
            <button type="button" className="mt-3 text-xs text-muted hover:text-danger" onClick={async () => {
              if (confirm("¿Quitar este plano? Las ventanas se conservan sin marca.")) { await ctx.act(deletePlan(data.project.id, plan.id), "Plano quitado."); setPlanId(null); }
            }}>Quitar este plano</button>
          )}
        </div>

        {/* Lista lateral sincronizada + editor */}
        <aside className="lg:col-span-4">
          {selLines.length ? (
            <div>
              <button type="button" className="mb-3 font-mono text-xs text-muted hover:text-ink" onClick={() => setSelected([])}>← Volver a la lista</button>
              <LineEditor key={selLines.map((l) => `${l.id}:${l.status}:${l.unitPrice}:${l.locationId}`).join(",")} ctx={ctx} lines={selLines} onDone={() => setSelected([])} />
            </div>
          ) : (
            <>
              <div className="flex gap-4 border-b border-line pb-2 text-xs">
                {(["todas", ...LINE_STATUSES] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setFilter(s)} className={filter === s ? "text-ink underline underline-offset-4" : "text-muted hover:text-ink"}>
                    {s === "todas" ? "Todas" : LINE_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
              <ul className="max-h-[560px] divide-y divide-line overflow-auto" data-testid="annotation-list">
                {listed.map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      className="grid w-full grid-cols-[3rem_1fr_auto] items-baseline gap-2 py-2 text-left text-sm hover:bg-white-stone"
                      onClick={(e) => {
                        if (e.ctrlKey || e.metaKey || e.shiftKey) onSelect([l.id], true);
                        else { setFocusIds([l.id]); setSelected([l.id]); }
                      }}
                    >
                      <span className="font-mono text-xs"><i className="mr-1.5 inline-block size-2 align-middle" style={{ background: LINE_STATUS_COLORS[l.status as LineStatus] }} />{l.label}</span>
                      <span className="truncate">
                        {l.config?.modelName ?? <span className="text-muted">Sin configurar</span>}
                        <span className="block truncate text-xs text-muted">{locName(l.locationId ? locById.get(l.locationId) : null)}</span>
                      </span>
                      <span className="font-mono text-xs text-muted">{l.width && l.height ? `${l.width}×${l.height}` : ""}</span>
                    </button>
                  </li>
                ))}
                {listed.length === 0 && <li className="py-6 text-sm text-muted">Sin marcas. Elija Punto o Rectángulo y marque sobre el plano.</li>}
              </ul>
              {!readOnly && listed.length > 1 && (
                <button type="button" className="mt-3 text-xs text-muted underline" onClick={() => {
                  const ids = listed.filter((l) => l.status === "sin_configurar").map((l) => l.id);
                  setSelected(ids);
                  setFocusIds(ids);
                }}>
                  Seleccionar las sin configurar
                </button>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
