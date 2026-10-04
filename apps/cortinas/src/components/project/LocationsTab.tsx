"use client";
/**
 * Pestaña "Ubicaciones y líneas": árbol edificio > piso > ambiente a la
 * izquierda, líneas de la ubicación elegida a la derecha y el editor.
 */
import { useMemo, useState } from "react";
import { formatMoney, formatMeters } from "@portafolio/core/pricing";
import { LINE_STATUS_COLORS, type LineStatus } from "@portafolio/core/projects";
import { addLocation, deleteLocation, duplicateLocation, updateLocation } from "@/app/actions/project";
import { LineEditor } from "./LineEditor";
import { btnLine, inputCls, labelCls, locName, type EditorContext, type Location } from "./shared";

export function LocationsTab({ ctx }: { ctx: EditorContext }) {
  const { data, readOnly } = ctx;
  const [locId, setLocId] = useState<number | "all">(data.locations[0]?.id ?? "all");
  const [selected, setSelected] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);
  const [times, setTimes] = useState("1");
  const current = data.locations.find((l) => l.id === locId);
  const [form, setForm] = useState({ building: current?.building ?? "Edificio principal", floor: current?.floor ?? "Piso 1", room: "" });
  const [editingLoc, setEditingLoc] = useState(false);

  // Árbol: edificio -> piso -> ambientes
  const tree = useMemo(() => {
    const t = new Map<string, Map<string, Location[]>>();
    for (const l of data.locations) {
      const b = t.get(l.building) ?? new Map();
      b.set(l.floor, [...(b.get(l.floor) ?? []), l]);
      t.set(l.building, b);
    }
    return t;
  }, [data.locations]);

  const count = (id: number) => data.lines.filter((l) => l.locationId === id).reduce((s, l) => s + l.quantity, 0);
  const lines = locId === "all" ? data.lines : data.lines.filter((l) => l.locationId === locId);
  const selLines = data.lines.filter((l) => selected.includes(l.id));
  const locById = new Map(data.locations.map((l) => [l.id, l]));

  const toggle = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const pick = (id: number | "all") => {
    setLocId(id);
    setSelected([]);
    setCreating(false);
    setEditingLoc(false);
  };

  async function add() {
    const r = await ctx.act(addLocation(data.project.id, form), "Ubicación agregada.");
    if (r?.createdId) {
      pick(r.createdId);
      setForm((f) => ({ ...f, room: "" }));
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      {/* Árbol de ubicaciones */}
      <aside className="lg:col-span-3">
        <button type="button" onClick={() => pick("all")} className={`block w-full border-b border-line py-2 text-left text-sm ${locId === "all" ? "text-ink" : "text-muted hover:text-ink"}`}>
          Todas las ventanas <span className="float-right font-mono text-xs">{data.lines.reduce((s, l) => s + l.quantity, 0)}</span>
        </button>
        <div className="mt-2 max-h-[560px] overflow-auto pr-1" data-testid="location-tree">
          {[...tree].map(([building, floors]) => (
            <div key={building} className="mt-4">
              <p className="font-serif text-lg">{building || "Sin edificio"}</p>
              {[...floors].map(([floor, rooms]) => (
                <div key={floor} className="mt-1 border-l border-line pl-3">
                  <p className="font-mono text-[11px] text-muted">{floor || "Sin piso"}</p>
                  <ul>
                    {rooms.map((r) => (
                      <li key={r.id}>
                        <button type="button" onClick={() => pick(r.id)} className={`flex w-full justify-between py-1 text-left text-sm ${locId === r.id ? "text-ink underline decoration-accent underline-offset-4" : "text-muted hover:text-ink"}`}>
                          <span>{r.room}</span>
                          <span className="font-mono text-xs">{count(r.id)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
        {!readOnly && (
          <div className="mt-6 space-y-3 border-t border-ink pt-4">
            <p className={labelCls}>Nueva ubicación</p>
            <input className={inputCls} placeholder="Edificio" value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} aria-label="Edificio" />
            <input className={inputCls} placeholder="Piso" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} aria-label="Piso" />
            <input className={inputCls} placeholder="Ambiente (p. ej. Aula 201)" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} aria-label="Ambiente" />
            <button type="button" className={btnLine} disabled={ctx.busy || !form.room.trim()} onClick={add}>Agregar ubicación</button>
          </div>
        )}
      </aside>

      {/* Líneas */}
      <section className="lg:col-span-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3">
          <h2 className="text-[1.7rem] leading-tight">{current ? current.room : "Todas las ventanas"}</h2>
          {current && <span className="font-mono text-xs text-muted">{[current.building, current.floor].filter(Boolean).join(" · ")}</span>}
        </div>
        {current && !readOnly && (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <button type="button" className={btnLine} onClick={() => { setCreating(true); setSelected([]); }}>Agregar ventana</button>
            <span className="flex items-center gap-2">
              <button
                type="button"
                className={btnLine}
                disabled={ctx.busy}
                onClick={async () => {
                  const r = await ctx.act(duplicateLocation(data.project.id, current.id, Number(times) || 1), "Ubicación duplicada con sus ventanas.");
                  if (r?.createdId) pick(r.createdId);
                }}
              >
                Duplicar
              </button>
              <input className="w-10 border-b border-line bg-transparent text-center font-mono" value={times} onChange={(e) => setTimes(e.target.value.replace(/\D/g, ""))} aria-label="Veces" />
              <span className="text-muted">veces</span>
            </span>
            <button type="button" className="text-muted hover:text-ink" onClick={() => setEditingLoc(!editingLoc)}>Renombrar</button>
            <button
              type="button"
              className="ml-auto text-muted hover:text-danger"
              onClick={async () => {
                if (confirm(`¿Eliminar ${current.room} y sus ventanas sin plano?`)) {
                  const r = await ctx.act(deleteLocation(data.project.id, current.id), "Ubicación eliminada.");
                  if (r) pick(r.data.locations[0]?.id ?? "all");
                }
              }}
            >
              Eliminar
            </button>
          </div>
        )}
        {editingLoc && current && <RenameLocation ctx={ctx} loc={current} onDone={() => setEditingLoc(false)} />}

        {lines.length === 0 ? (
          <p className="mt-8 text-muted">Sin ventanas en esta ubicación.</p>
        ) : (
          <table className="mt-3 w-full text-left text-sm" data-testid="lines-table">
            <thead className="font-mono text-[11px] text-muted">
              <tr className="border-b border-line">
                <th className="w-6 py-2 font-normal" />
                <th className="py-2 font-normal">Cód.</th>
                <th className="py-2 font-normal">Producto</th>
                <th className="py-2 font-normal">Medidas</th>
                <th className="py-2 text-right font-normal">Cant.</th>
                <th className="py-2 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr
                  key={l.id}
                  className={`cursor-pointer border-b border-line ${selected.includes(l.id) ? "bg-white-stone" : "hover:bg-white-stone/60"}`}
                  onClick={(e) => {
                    setCreating(false);
                    if (e.ctrlKey || e.metaKey || e.shiftKey) toggle(l.id);
                    else setSelected([l.id]);
                  }}
                >
                  <td className="py-2" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggle(l.id)} aria-label={`Seleccionar ${l.label}`} className="accent-[#1f3a5f]" />
                  </td>
                  <td className="py-2 font-mono text-xs">
                    <span className="mr-1.5 inline-block size-2 align-middle" style={{ background: LINE_STATUS_COLORS[l.status as LineStatus] }} />
                    {l.label}
                  </td>
                  <td className="py-2">
                    {l.config ? l.config.modelName : <span className="text-muted">Sin configurar</span>}
                    {locId === "all" && <span className="block text-xs text-muted">{locName(l.locationId ? locById.get(l.locationId) : null)}</span>}
                  </td>
                  <td className="py-2 font-mono text-xs">{l.width && l.height ? `${formatMeters(l.width)} × ${formatMeters(l.height)}` : "—"}</td>
                  <td className="py-2 text-right font-mono text-xs">{l.quantity}</td>
                  <td className="py-2 text-right">{l.config && l.unitPrice ? formatMoney(l.unitPrice * l.quantity) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {lines.length > 1 && !readOnly && (
          <p className="mt-3 text-xs text-muted">
            Marque varias casillas (o Ctrl + clic) para aplicar la misma configuración.{" "}
            <button type="button" className="underline" onClick={() => setSelected(lines.map((l) => l.id))}>Seleccionar todas</button>
          </p>
        )}
      </section>

      {/* Editor */}
      <aside className="lg:col-span-4 lg:border-l lg:border-line lg:pl-8">
        {creating && current ? (
          <LineEditor key={`new-${current.id}`} ctx={ctx} lines={[]} isNew defaultLocationId={current.id} onDone={(id) => { setCreating(false); if (id) setSelected([id]); }} />
        ) : selLines.length ? (
          <LineEditor key={selLines.map((l) => `${l.id}:${l.status}:${l.unitPrice}`).join(",")} ctx={ctx} lines={selLines} onDone={() => setSelected([])} />
        ) : (
          <div className="grid-paper border border-line p-6 text-sm text-muted">
            Elija una ventana para editarla, o agregue una nueva. Con varias seleccionadas puede aplicar el mismo producto a todas.
          </div>
        )}
      </aside>
    </div>
  );
}

function RenameLocation({ ctx, loc, onDone }: { ctx: EditorContext; loc: { id: number; building: string; floor: string; room: string }; onDone: () => void }) {
  const [v, setV] = useState({ building: loc.building, floor: loc.floor, room: loc.room });
  return (
    <div className="mt-3 grid grid-cols-3 gap-3 border-b border-line pb-4">
      <input className={inputCls} value={v.building} onChange={(e) => setV({ ...v, building: e.target.value })} aria-label="Edificio" />
      <input className={inputCls} value={v.floor} onChange={(e) => setV({ ...v, floor: e.target.value })} aria-label="Piso" />
      <input className={inputCls} value={v.room} onChange={(e) => setV({ ...v, room: e.target.value })} aria-label="Ambiente" />
      <button
        type="button"
        className={`${btnLine} col-span-3 justify-self-start`}
        onClick={async () => {
          if (await ctx.act(updateLocation(ctx.data.project.id, loc.id, v), "Ubicación actualizada.")) onDone();
        }}
      >
        Guardar nombre
      </button>
    </div>
  );
}
