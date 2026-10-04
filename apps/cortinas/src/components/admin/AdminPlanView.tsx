"use client";
/**
 * Vista del plano para el admin: mismo visor (solo lectura), lista lateral
 * sincronizada y comentarios por anotación (pueden marcarla como observada).
 */
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { formatMoney } from "@portafolio/core/pricing";
import { LINE_STATUS_COLORS, LINE_STATUS_LABELS, LINE_STATUSES, type LineStatus } from "@portafolio/core/projects";
import { commentLine } from "@/app/admin/actions";
import type { ProjectData } from "@/lib/project";

const PlanViewer = dynamic(() => import("@portafolio/core/ui/PlanViewer").then((m) => m.PlanViewer), {
  ssr: false,
  loading: () => <div className="grid h-[600px] place-items-center border border-line text-sm text-muted">Cargando visor…</div>,
});

type Props = Pick<ProjectData, "plans" | "lines" | "comments" | "locations">;

export function AdminPlanView({ plans, lines: initialLines, comments: initialComments, locations }: Props) {
  const [planId, setPlanId] = useState(plans[0].id);
  const [lines, setLines] = useState(initialLines);
  const [comments, setComments] = useState(initialComments);
  const [selected, setSelected] = useState<number[]>([]);
  const [focusIds, setFocusIds] = useState<number[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const plan = plans.find((p) => p.id === planId)!;
  const locById = new Map(locations.map((l) => [l.id, l]));

  const planLines = useMemo(() => lines.filter((l) => l.planId === plan.id && l.x != null), [lines, plan.id]);
  const annotations = useMemo(
    () => planLines.map((l) => ({ id: l.id, label: l.label, shape: (l.shape === "rect" ? "rect" : "point") as "rect" | "point", x: l.x!, y: l.y!, w: l.w, h: l.h, color: LINE_STATUS_COLORS[l.status as LineStatus] })),
    [planLines],
  );
  const current = selected.length === 1 ? lines.find((l) => l.id === selected[0]) : undefined;

  async function submit(status?: LineStatus) {
    if (!current) return;
    setBusy(true);
    const r = await commentLine(current.id, body, status);
    setBusy(false);
    if (r.ok) {
      setLines((ls) => ls.map((l) => r.lines.find((x) => x.id === l.id) ?? l));
      setComments((cs) => [...r.comments, ...cs.filter((c) => c.lineId !== current.id)]);
      setBody("");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-ink pb-2">
        <h2 className="text-2xl">Plano y anotaciones</h2>
        <div className="flex gap-5 text-sm">
          {plans.map((p) => (
            <button key={p.id} type="button" onClick={() => { setPlanId(p.id); setSelected([]); }} className={p.id === planId ? "underline decoration-accent underline-offset-4" : "text-muted hover:text-ink"}>
              {p.kind === "foto" ? "Foto" : "Plano"} · {p.name}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <PlanViewer imageUrl={`/api/planos/${plan.id}`} width={plan.width} height={plan.height} annotations={annotations} selectedIds={selected} focusIds={focusIds}
            onSelect={(ids, add) => setSelected((s) => (add ? [...new Set([...s, ...ids])] : ids))} className="h-[600px]" />
          <p className="mt-2 font-mono text-xs text-muted">
            {LINE_STATUSES.map((s) => (
              <span key={s} className="mr-5"><i className="mr-1.5 inline-block size-2 align-middle" style={{ background: LINE_STATUS_COLORS[s] }} />{LINE_STATUS_LABELS[s]} ({planLines.filter((l) => l.status === s).length})</span>
            ))}
          </p>
        </div>
        <aside className="xl:col-span-4">
          {current ? (
            <div data-testid="admin-annotation">
              <button type="button" className="font-mono text-xs text-muted hover:text-ink" onClick={() => setSelected([])}>← Lista</button>
              <div className="mt-2 flex items-baseline justify-between">
                <h3 className="text-2xl">{current.label}</h3>
                <span className="font-mono text-xs" style={{ color: LINE_STATUS_COLORS[current.status as LineStatus] }}>{LINE_STATUS_LABELS[current.status as LineStatus]}</span>
              </div>
              <dl className="mt-3 divide-y divide-line border-y border-line text-sm">
                <div className="flex justify-between py-1.5"><dt className="text-muted">Ubicación</dt><dd>{current.locationId ? locById.get(current.locationId)?.room : "—"}</dd></div>
                <div className="flex justify-between py-1.5"><dt className="text-muted">Producto</dt><dd>{current.config?.modelName ?? "Sin configurar"}</dd></div>
                <div className="flex justify-between py-1.5"><dt className="text-muted">Tela</dt><dd>{current.config?.fabricName ?? "—"}</dd></div>
                <div className="flex justify-between py-1.5"><dt className="text-muted">Medidas</dt><dd className="font-mono text-xs">{current.width ?? "—"} × {current.height ?? "—"} cm</dd></div>
                <div className="flex justify-between py-1.5"><dt className="text-muted">Cantidad · precio</dt><dd>{current.quantity} · {current.config && current.unitPrice ? formatMoney(current.unitPrice * current.quantity) : "—"}</dd></div>
                {current.note && <div className="py-1.5"><dt className="text-muted">Nota del cliente</dt><dd>{current.note}</dd></div>}
              </dl>
              <ul className="mt-4 space-y-3 text-sm">
                {comments.filter((c) => c.lineId === current.id).map((c) => (
                  <li key={c.id} className="border-l-2 border-line pl-3">
                    <p>{c.body}</p>
                    <p className="font-mono text-[11px] text-muted">{c.author} · {new Date(c.createdAt).toLocaleString("es-PE")}</p>
                  </li>
                ))}
              </ul>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Comentario para el cliente (p. ej. confirmar alto del vano)"
                className="mt-4 min-h-20 w-full resize-y border-b border-line bg-transparent py-1.5 text-sm outline-none focus:border-ink" data-testid="admin-comment" />
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" disabled={busy || !body.trim()} onClick={() => submit("observada")} className="bg-danger px-3 py-1.5 text-sm text-white-stone disabled:opacity-50">Comentar y observar</button>
                <button type="button" disabled={busy || !body.trim()} onClick={() => submit()} className="border border-line px-3 py-1.5 text-sm hover:border-ink disabled:opacity-50">Solo comentar</button>
                {current.status === "observada" && current.config && (
                  <button type="button" disabled={busy} onClick={() => submit("configurada")} className="text-sm text-muted hover:text-ink">Levantar observación</button>
                )}
              </div>
            </div>
          ) : (
            <ul className="max-h-[640px] divide-y divide-line overflow-auto">
              {planLines.map((l) => (
                <li key={l.id}>
                  <button type="button" className="grid w-full grid-cols-[3rem_1fr_auto] gap-2 py-2 text-left text-sm hover:bg-white-stone" onClick={() => { setFocusIds([l.id]); setSelected([l.id]); }}>
                    <span className="font-mono text-xs"><i className="mr-1.5 inline-block size-2 align-middle" style={{ background: LINE_STATUS_COLORS[l.status as LineStatus] }} />{l.label}</span>
                    <span className="truncate">{l.config?.modelName ?? <span className="text-muted">Sin configurar</span>}<span className="block truncate text-xs text-muted">{l.locationId ? locById.get(l.locationId)?.room : ""}</span></span>
                    <span className="font-mono text-xs text-muted">{comments.some((c) => c.lineId === l.id) ? "●" : ""}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
