"use client";
/**
 * Editor de una línea (o de varias a la vez, en modo "bulk").
 * Calcula el precio en vivo en el navegador con el mismo motor que el servidor;
 * el servidor lo recalcula al guardar (nunca confiamos en el precio del cliente).
 */
import { useState } from "react";
import { formatMoney, validateDimensions, type Drive } from "@portafolio/core/pricing";
import { LINE_STATUS_COLORS, LINE_STATUS_LABELS, type LineStatus } from "@portafolio/core/projects";
import { fabricsFor, priceLine } from "@/lib/line-price";
import { DRIVE_LABELS } from "@/lib/content";
import { CurtainPreview } from "@/components/CurtainPreview";
import { applyConfig, deleteLines, saveLine } from "@/app/actions/project";
import { btnLine, btnPrimary, inputCls, labelCls, locName, type EditorContext, type Line } from "./shared";

interface Props {
  ctx: EditorContext;
  lines: Line[]; // 1 = edición normal; >1 = aplicar la misma configuración
  isNew?: boolean;
  defaultLocationId?: number | null;
  suggested?: { width: number; height: number } | null; // desde el plano calibrado
  onDone?: (createdId?: number) => void;
  comments?: boolean;
}

export function LineEditor({ ctx, lines, isNew, defaultLocationId = null, suggested, onDone, comments = true }: Props) {
  const { catalog, data, readOnly } = ctx;
  const bulk = lines.length > 1;
  const first = lines[0];
  const [modelId, setModelId] = useState<number>(first?.config?.modelId ?? catalog.models[0]?.id ?? 0);
  const model = catalog.models.find((m) => m.id === modelId);
  const fabrics = model ? fabricsFor(catalog, model) : [];
  const [fabricId, setFabricId] = useState<number>(first?.config?.fabricId ?? fabrics[0]?.id ?? 0);
  const [frameId, setFrameId] = useState<number>(first?.config?.frameColorId ?? catalog.frames[0]?.id ?? 0);
  const [drive, setDrive] = useState<Drive>(first?.config?.drive ?? "manual");
  const [width, setWidth] = useState<string>(bulk ? "" : String(first?.width ?? suggested?.width ?? 150));
  const [height, setHeight] = useState<string>(bulk ? "" : String(first?.height ?? suggested?.height ?? 150));
  const [quantity, setQuantity] = useState(String(first?.quantity ?? 1));
  const [note, setNote] = useState(first?.note ?? "");
  const [locationId, setLocationId] = useState<number | null>(first ? first.locationId : defaultLocationId);

  // Si cambia el producto y la tela ya no es compatible, tomamos la primera compatible.
  const effectiveFabric = fabrics.find((f) => f.id === fabricId) ?? fabrics[0];
  // En modo bulk, si no se escriben medidas, mostramos el precio con las de la primera ventana.
  const w = Number(width) || (bulk ? first?.width ?? 0 : 0);
  const h = Number(height) || (bulk ? first?.height ?? 0 : 0);
  const errors = model && w && h ? validateDimensions(model, w, h) : [];
  // Cálculo barato: no hace falta memorizarlo.
  const preview = model && w && h && !errors.length ? priceLine(catalog, { modelId: model.id, fabricId: effectiveFabric?.id ?? 0, frameColorId: frameId, drive, width: w, height: h }) : null;
  const qty = Math.max(1, Number(quantity) || 1);
  const lineComments = first && comments ? data.comments.filter((c) => c.lineId === first.id) : [];

  async function save(withConfig: boolean) {
    if (bulk) {
      const r = await ctx.act(
        applyConfig(data.project.id, lines.map((l) => l.id), { modelId, fabricId: effectiveFabric?.id ?? 0, frameColorId: frameId, drive, width: w || null, height: h || null }),
        `Configuración aplicada a ${lines.length} ventanas.`,
      );
      if (r) onDone?.();
      return;
    }
    const r = await ctx.act(
      saveLine(data.project.id, {
        id: isNew ? undefined : first?.id, locationId, width: w || null, height: h || null, quantity: qty, note,
        modelId: withConfig ? modelId : null, fabricId: effectiveFabric?.id ?? null, frameColorId: frameId, drive,
      }),
      isNew ? "Ventana agregada." : "Cambios guardados.",
    );
    if (r) onDone?.(r.createdId);
  }

  async function remove() {
    if (!confirm(bulk ? `¿Eliminar ${lines.length} ventanas?` : `¿Eliminar ${first.label}?`)) return;
    const r = await ctx.act(deleteLines(data.project.id, lines.map((l) => l.id)), "Eliminado.");
    if (r) onDone?.();
  }

  return (
    <div className="space-y-5" data-testid="line-editor">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[1.5rem] leading-tight">
          {isNew ? "Nueva ventana" : bulk ? `${lines.length} ventanas seleccionadas` : first.label}
        </h3>
        {!isNew && !bulk && (
          <span className="font-mono text-xs" style={{ color: LINE_STATUS_COLORS[first.status as LineStatus] }}>{LINE_STATUS_LABELS[first.status as LineStatus]}</span>
        )}
      </div>
      {bulk && <p className="font-mono text-xs text-muted">{lines.map((l) => l.label).join(", ")}</p>}

      <div className="grid grid-cols-2 gap-x-5 gap-y-4">
        <label className="col-span-2">
          <span className={labelCls}>Producto</span>
          <select className={inputCls} value={modelId} disabled={readOnly} onChange={(e) => setModelId(Number(e.target.value))} name="modelId">
            {catalog.models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <label>
          <span className={labelCls}>Tela</span>
          <select className={inputCls} value={effectiveFabric?.id ?? 0} disabled={readOnly} onChange={(e) => setFabricId(Number(e.target.value))}>
            {fabrics.map((f) => <option key={f.id} value={f.id}>{f.collection} · {f.name}</option>)}
          </select>
        </label>
        <label>
          <span className={labelCls}>Perfil</span>
          <select className={inputCls} value={frameId} disabled={readOnly} onChange={(e) => setFrameId(Number(e.target.value))}>
            {catalog.frames.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
        <label className="col-span-2">
          <span className={labelCls}>Accionamiento</span>
          <select className={inputCls} value={drive} disabled={readOnly} onChange={(e) => setDrive(e.target.value as Drive)}>
            {(Object.keys(DRIVE_LABELS) as Drive[]).map((d) => <option key={d} value={d}>{DRIVE_LABELS[d]}</option>)}
          </select>
        </label>
        <label>
          <span className={labelCls}>Ancho (cm){bulk && " · vacío = conservar"}</span>
          <input className={`${inputCls} font-mono`} inputMode="numeric" value={width} disabled={readOnly} onChange={(e) => setWidth(e.target.value.replace(/\D/g, ""))} name="width" />
        </label>
        <label>
          <span className={labelCls}>Alto (cm){bulk && " · vacío = conservar"}</span>
          <input className={`${inputCls} font-mono`} inputMode="numeric" value={height} disabled={readOnly} onChange={(e) => setHeight(e.target.value.replace(/\D/g, ""))} name="height" />
        </label>
        {!bulk && (
          <>
            <label>
              <span className={labelCls}>Cantidad</span>
              <input className={`${inputCls} font-mono`} inputMode="numeric" value={quantity} disabled={readOnly} onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))} name="quantity" />
            </label>
            <label>
              <span className={labelCls}>Ubicación</span>
              <select className={inputCls} value={locationId ?? ""} disabled={readOnly} onChange={(e) => setLocationId(Number(e.target.value) || null)}>
                <option value="">Sin ubicación</option>
                {data.locations.map((l) => <option key={l.id} value={l.id}>{locName(l)}</option>)}
              </select>
            </label>
            <label className="col-span-2">
              <span className={labelCls}>Nota</span>
              <input className={inputCls} value={note} disabled={readOnly} onChange={(e) => setNote(e.target.value)} placeholder="Ej.: ventana con reja, proyector al frente" />
            </label>
          </>
        )}
      </div>

      {suggested && isNew && <p className="font-mono text-xs text-muted">Medida sugerida por la escala del plano: {suggested.width} cm de ancho.</p>}
      {model && w > 0 && h > 0 && errors.length > 0 && <p className="text-sm text-danger">{errors[0]}</p>}

      <div className="grid grid-cols-[1fr_auto] items-end gap-4 border-t border-line pt-4">
        {model && w > 0 && h > 0 ? (
          <CurtainPreview width={w} height={h} hex={effectiveFabric?.hex ?? "#ccc"} type={model.type} className="h-32 w-auto" />
        ) : (
          <span />
        )}
        <div className="text-right">
          <p className="font-mono text-[11px] text-muted">{bulk ? `Precio por ventana (${first.label})` : `Precio unitario × ${qty}`}</p>
          <p className="font-serif text-[2rem] leading-none" data-testid="line-price">
            {preview ? formatMoney(bulk ? preview.unitPrice : preview.unitPrice * qty) : "—"}
          </p>
        </div>
      </div>

      {!readOnly && (
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={ctx.busy || errors.length > 0} onClick={() => save(true)} className={btnPrimary}>
            {bulk ? `Aplicar a ${lines.length}` : "Guardar configuración"}
          </button>
          {!bulk && (
            <button type="button" disabled={ctx.busy} onClick={() => save(false)} className={btnLine} title="Guarda medidas y cantidad, sin producto">
              Solo medidas
            </button>
          )}
          {!isNew && (
            <button type="button" disabled={ctx.busy} onClick={remove} className="ml-auto text-sm text-muted hover:text-danger">
              Eliminar
            </button>
          )}
        </div>
      )}

      {lineComments.length > 0 && (
        <div className="border-t border-line pt-4">
          <p className={labelCls}>Observaciones de Cota</p>
          <ul className="mt-2 space-y-3 text-sm">
            {lineComments.map((c) => (
              <li key={c.id}>
                <p>{c.body}</p>
                <p className="mt-0.5 font-mono text-[11px] text-muted">{c.author} · {new Date(c.createdAt).toLocaleDateString("es-PE")}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
