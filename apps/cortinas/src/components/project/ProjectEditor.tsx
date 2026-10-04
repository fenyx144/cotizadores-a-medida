"use client";
/**
 * Editor "Mi proyecto": cabecera + cuatro pestañas.
 * El estado del proyecto vive aquí; cada acción del servidor devuelve el
 * proyecto actualizado y simplemente lo reemplazamos (sin recargar la página).
 */
import { useState } from "react";
import { formatMoney } from "@portafolio/core/pricing";
import { PROJECT_STATUS_LABELS, summarizeProject, type ProjectStatus } from "@portafolio/core/projects";
import { LocationsTab } from "./LocationsTab";
import { PlanTab } from "./PlanTab";
import { ImportTab } from "./ImportTab";
import { SummaryTab } from "./SummaryTab";
import type { ActionResult, CatalogData, EditorContext, ProjectData } from "./shared";

type Tab = "ubicaciones" | "plano" | "importar" | "resumen";
const TABS: { key: Tab; label: string }[] = [
  { key: "plano", label: "Plano y fotos" },
  { key: "ubicaciones", label: "Ubicaciones y líneas" },
  { key: "importar", label: "Importar medidas" },
  { key: "resumen", label: "Resumen y envío" },
];

export function ProjectEditor({ initial, catalog, initialTab }: { initial: ProjectData; catalog: CatalogData; initialTab?: Tab }) {
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState<Tab>(initialTab ?? (initial.plans.length ? "plano" : "ubicaciones"));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const readOnly = data.project.status !== "borrador";

  const act: EditorContext["act"] = async (p, okMessage) => {
    setBusy(true);
    let r: ActionResult;
    try {
      r = await p;
    } catch {
      r = { ok: false, error: "Sin conexión con el servidor." };
    }
    setBusy(false);
    if (r.ok) {
      setData(r.data);
      setMessage(okMessage ? { text: okMessage } : null);
      if (okMessage) setTimeout(() => setMessage(null), 3500);
      return r;
    }
    setMessage({ text: r.error, error: true });
    return null;
  };
  const ctx: EditorContext = { data, catalog, readOnly, busy, act };
  const s = summarizeProject(data.lines.map((l) => ({ locationName: "", productName: l.config?.modelName ?? null, quantity: l.quantity, unitPrice: l.config ? l.unitPrice : null })));

  return (
    <div className="mx-auto max-w-[1440px] px-5 pt-8 md:px-10">
      <header className="grid gap-4 border-b border-line pb-5 md:grid-cols-12 md:items-end">
        <div className="md:col-span-7">
          <p className="font-mono text-xs text-muted">
            {data.project.reference} · {data.client.company || data.client.name} · {PROJECT_STATUS_LABELS[data.project.status as ProjectStatus]}
          </p>
          <h1 className="mt-2 text-[2.3rem] leading-[1.05] md:text-[2.8rem]">{data.project.name}</h1>
        </div>
        <dl className="flex gap-8 md:col-span-5 md:justify-end">
          <div><dt className="font-mono text-[11px] text-muted">Cortinas</dt><dd className="font-serif text-[1.8rem] leading-none" data-testid="header-windows">{s.windows}</dd></div>
          <div><dt className="font-mono text-[11px] text-muted">Ubicaciones</dt><dd className="font-serif text-[1.8rem] leading-none">{data.locations.length}</dd></div>
          <div><dt className="font-mono text-[11px] text-muted">Total con IGV</dt><dd className="font-serif text-[1.8rem] leading-none">{formatMoney(s.total)}</dd></div>
        </dl>
      </header>

      <nav className="sticky top-[61px] z-[900] -mx-5 flex gap-7 overflow-x-auto border-b border-line bg-paper/95 px-5 text-[0.95rem] backdrop-blur md:-mx-10 md:px-10" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} type="button" onClick={() => setTab(t.key)}
            className={`-mb-px shrink-0 border-b py-3 ${tab === t.key ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}>
            {t.label}
          </button>
        ))}
        <span className="ml-auto shrink-0 self-center text-sm" aria-live="polite">
          {busy ? <span className="text-muted">Guardando…</span> : message && <span className={message.error ? "text-danger" : "text-blue"} data-testid="editor-message">{message.text}</span>}
        </span>
      </nav>

      {readOnly && (
        <p className="mt-4 border-l-2 border-blue pl-3 text-sm text-muted">
          Proyecto en estado “{PROJECT_STATUS_LABELS[data.project.status as ProjectStatus]}”: solo lectura. Las observaciones de Cota aparecen en cada ventana.
        </p>
      )}

      <div className="mt-8">
        {tab === "ubicaciones" && <LocationsTab ctx={ctx} />}
        {tab === "plano" && <PlanTab ctx={ctx} onGoToSummary={() => setTab("resumen")} />}
        {tab === "importar" && <ImportTab ctx={ctx} onImported={() => setTab("ubicaciones")} />}
        {tab === "resumen" && <SummaryTab ctx={ctx} />}
      </div>
    </div>
  );
}
