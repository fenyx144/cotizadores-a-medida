"use client";
/**
 * Planilla de líneas: una fila por ventana (o grupo de ventanas iguales).
 * Celdas editables, duplicar filas, añadir N copias, pegar desde Excel (TSV)
 * e importar CSV/XLSX. Valida en vivo con el motor de reglas (errores por celda)
 * y el servidor vuelve a validar al guardar.
 */
import { SHOW_PRICES } from "@/lib/flags";
import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@portafolio/core/pricing";
import { readSheetFile, saveGrid, type GridCellErrors, type GridRowInput } from "@/app/actions/project";
import { priceLine } from "@/lib/line-price";
import { evaluate, gridAttributes, matchVariant, parseAttributeCell, withDefaults, type Choice, type Values } from "@/lib/rules";
import { btnLine, btnPrimary, labelCls, locName, type EditorContext } from "./shared";

/** Columnas fijas; las de atributos son "a<id>". */
type Col = string;
interface Row {
  key: string;
  id?: number;
  location: string;
  modelId: number | null;
  width: string;
  height: string;
  quantity: string;
  values: Values;
  note: string;
  unmatched?: Record<string, string | undefined>;
}

const BASE_ALIASES: Record<string, string[]> = {
  location: ["ubicacion", "ambiente", "aula", "oficina", "espacio", "local"],
  model: ["producto", "modelo", "tipo"],
  width: ["ancho_cm", "ancho", "ancho (cm)"],
  height: ["alto_cm", "alto", "alto (cm)"],
  quantity: ["cantidad", "cant", "unidades", "uds"],
  note: ["nota", "observacion", "comentario"],
};
/** Encabezados antiguos de la plantilla, por nombre de atributo. */
const LEGACY: Record<string, string[]> = { tela: ["tejido", "color_tela"], "color del perfil": ["color_perfil", "perfil", "color perfil", "ral"], accionamiento: ["mando", "motor"], caida: [] };

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
let seq = 0;
const newKey = () => `n${Date.now().toString(36)}${seq++}`;
const cell = "w-full bg-transparent px-1.5 py-1 outline-none focus:bg-white-stone";

/** "1,80" (m) -> 180; "180" -> 180. */
function toCm(v: string): string {
  const n = Number(v.replace(",", ".").replace(/[^\d.]/g, ""));
  if (!n) return "";
  return String(Math.round(n < 10 ? n * 100 : n));
}

export function LinesGrid({ ctx }: { ctx: EditorContext }) {
  const { data, catalog, readOnly } = ctx;
  const locById = useMemo(() => new Map(data.locations.map((l) => [l.id, l])), [data.locations]);
  const attrs = useMemo(() => gridAttributes(catalog), [catalog]);
  const COLS = useMemo(() => [
    { key: "location", label: "Ubicación", w: "min-w-[150px]" },
    { key: "model", label: "Producto", w: "min-w-[170px]" },
    { key: "width", label: "Ancho cm", w: "w-[76px]" },
    { key: "height", label: "Alto cm", w: "w-[76px]" },
    { key: "quantity", label: "Cant.", w: "w-[56px]" },
    ...attrs.map((a) => ({ key: `a${a.id}`, label: a.name, w: a.kind === "sino" ? "w-[70px]" : a.kind === "numero" ? "w-[80px]" : "min-w-[140px]" })),
    { key: "note", label: "Nota", w: "min-w-[140px]" },
  ], [attrs]);

  const fromData = () =>
    data.lines.map<Row>((l) => ({
      key: `l${l.id}`, id: l.id, location: locName(l.locationId ? locById.get(l.locationId) : null) || "",
      modelId: l.config?.modelId ?? null, width: l.width ? String(l.width) : "", height: l.height ? String(l.height) : "", quantity: String(l.quantity),
      values: l.config?.values ?? {}, note: l.note,
    }));
  const [rows, setRows] = useState<Row[]>(fromData);
  const [dirty, setDirty] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [copies, setCopies] = useState("10");
  const [serverErr, setServerErr] = useState<GridCellErrors>({});
  const [importMsg, setImportMsg] = useState<string | null>(null);
  // Tras guardar (u otra acción) recargamos desde el servidor si no hay cambios locales.
  useEffect(() => { if (!dirty) setRows(fromData()); }, [data.lines]); // eslint-disable-line react-hooks/exhaustive-deps

  const evals = rows.map((r) =>
    r.modelId ? evaluate(catalog, { modelId: r.modelId, values: r.values, width: Number(r.width) || null, height: Number(r.height) || null }) : null,
  );
  const errorsOf = (i: number): Record<Col, string> => {
    const r = rows[i], ev = evals[i];
    const e: Record<Col, string> = {};
    for (const [k, v] of Object.entries(r.unmatched ?? {})) if (v) e[k] = `No reconocido: “${v}”.`;
    if (!r.location.trim()) e.location = "Indique la ubicación.";
    if (!Number(r.width)) e.width ??= "Indique el ancho.";
    if (!Number(r.height)) e.height ??= "Indique el alto.";
    const q = Number(r.quantity);
    if (!(q >= 1 && q <= 500)) e.quantity = "Cantidad entre 1 y 500.";
    if (ev) for (const [k, v] of Object.entries(ev.errors)) if (v) e[k] ??= v;
    const s = serverErr[i];
    if (s) for (const [k, v] of Object.entries(s)) if (v) e[k] ??= v;
    return e;
  };
  const allErrors = rows.map((_, i) => errorsOf(i));
  const badRows = allErrors.filter((e) => Object.keys(e).length).length;

  const price = (i: number) => {
    const r = rows[i];
    if (!r.modelId || Object.keys(allErrors[i]).length) return null;
    const p = priceLine(catalog, { modelId: r.modelId, values: r.values, width: Number(r.width), height: Number(r.height) });
    return p ? p.unitPrice * Number(r.quantity) : null;
  };
  const total = rows.reduce((s, _, i) => s + (price(i) ?? 0), 0);
  const windows = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);

  /** Completa valores por defecto (primero disponible) si faltan o ya no aplican; respeta lo no reconocido. */
  function normalizeRow(r: Row): Row {
    if (!r.modelId) return r;
    const values = withDefaults(catalog, { modelId: r.modelId, values: r.values }, true);
    for (const k of Object.keys(r.unmatched ?? {})) if (k.startsWith("a") && r.unmatched![k]) values[k.slice(1)] = null;
    return { ...r, values };
  }
  const update = (i: number, patch: Partial<Row>, col?: Col) => {
    setRows((rs) => rs.map((r, j) => (j === i ? normalizeRow({ ...r, ...patch, unmatched: col ? { ...r.unmatched, [col]: undefined } : r.unmatched }) : r)));
    setServerErr({});
    setDirty(true);
  };
  const blank = (): Row => {
    const last = rows[rows.length - 1];
    return normalizeRow({ key: newKey(), location: last?.location || `Ubicación ${data.locations.length + 1}`, modelId: last?.modelId ?? catalog.models[0]?.id ?? null, width: "", height: "", quantity: "1", values: { ...(last?.values ?? {}) }, note: "" });
  };
  const change = (fn: (rs: Row[]) => Row[]) => { setRows(fn); setServerErr({}); setDirty(true); };

  /** Convierte una tabla de texto (pegada o importada) en filas. */
  function tableToRows(table: string[][]): Row[] {
    const t = table.filter((r) => r.some((c) => c.trim()));
    if (!t.length) return [];
    const aliases: Record<Col, string[]> = { ...BASE_ALIASES };
    for (const a of attrs) aliases[`a${a.id}`] = [norm(a.name), norm(a.name).replace(/ /g, "_"), ...(LEGACY[norm(a.name)] ?? [])];
    const order: Col[] = ["location", "model", "width", "height", "quantity", ...attrs.map((a) => `a${a.id}`), "note"];
    const head = t[0].map(norm);
    const hasHeader = head.some((h) => Object.values(aliases).some((a) => a.includes(h)));
    const idx: Record<Col, number> = {};
    if (hasHeader) Object.keys(aliases).forEach((c) => { const k = head.findIndex((h) => aliases[c].includes(h)); if (k >= 0) idx[c] = k; });
    else order.forEach((c, k) => (idx[c] = k));
    return (hasHeader ? t.slice(1) : t).map((cells) => {
      const get = (c: Col) => (idx[c] != null ? (cells[idx[c]] ?? "").trim() : "");
      const unmatched: Row["unmatched"] = {};
      const pName = get("model");
      const model = pName ? catalog.models.find((m) => norm(m.name) === norm(pName) || m.slug === norm(pName) || norm(m.name).startsWith(norm(pName))) : catalog.models[0];
      if (pName && !model) unmatched.model = pName;
      const values: Values = {};
      for (const a of attrs) {
        const txt = get(`a${a.id}`);
        if (!txt) continue;
        const v = parseAttributeCell(catalog, a, txt, model);
        if (v === undefined) unmatched[`a${a.id}`] = txt;
        else values[a.id] = v;
      }
      return normalizeRow({
        key: newKey(), location: get("location") || "Ubicación 1", modelId: model?.id ?? null, width: toCm(get("width")), height: toCm(get("height")),
        quantity: String(Math.max(1, Math.round(Number(get("quantity").replace(",", ".")) || 1))), values, note: get("note"), unmatched,
      });
    });
  }

  function onPaste(e: React.ClipboardEvent) {
    if (readOnly) return;
    const text = e.clipboardData.getData("text/plain");
    if (!text.includes("\t") && !text.trim().includes("\n")) return; // pegado normal en una celda
    e.preventDefault();
    const table = text.replace(/\r/g, "").split("\n").map((l) => l.split("\t"));
    const added = tableToRows(table);
    change((rs) => [...rs.filter((r) => r.id || r.width || r.height), ...added]);
    setImportMsg(`${added.length} filas pegadas.`);
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    const r = await readSheetFile(data.project.id, fd);
    if ("error" in r) return setImportMsg(r.error);
    const added = tableToRows(r.table);
    change((rs) => [...rs, ...added]);
    setImportMsg(`${added.length} filas importadas de ${file.name}. Revise y guarde.`);
  }

  async function save() {
    const payload: GridRowInput[] = rows.map((r) => ({
      id: r.id ?? null, location: r.location, modelId: r.modelId, width: Number(r.width) || null, height: Number(r.height) || null,
      quantity: Number(r.quantity) || 0, values: r.values, note: r.note,
    }));
    const res = await saveGrid(data.project.id, payload);
    if (!res.ok && "cells" in res) {
      setServerErr(res.cells);
      await ctx.act(Promise.resolve({ ok: false, error: res.error }));
      return;
    }
    setDirty(false);
    setImportMsg(null);
    await ctx.act(Promise.resolve(res), `Tabla guardada: ${payload.length} filas.`);
  }

  const toggle = (k: string) => setSel((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const selected = rows.filter((r) => sel.has(r.key));
  const dup = (times: number) => {
    const src = selected.length ? selected : rows.slice(-1);
    if (!src.length) return;
    const n = Math.min(200, Math.max(1, times));
    change((rs) => {
      const out = [...rs];
      const at = Math.max(...src.map((r) => rs.indexOf(r))) + 1;
      const copies: Row[] = [];
      for (let t = 0; t < n; t++) for (const r of src) copies.push({ ...r, key: newKey(), id: undefined });
      out.splice(at, 0, ...copies);
      return out;
    });
  };

  const select = (i: number, col: Col, value: number | null, choices: Choice<number>[], onPick: (v: number | null) => void, placeholder: string, allowEmpty = false) => (
    <select className={cell} value={value ?? ""} disabled={readOnly} aria-label={`${COLS.find((c) => c.key === col)!.label} fila ${i + 1}`}
      onChange={(e) => onPick(Number(e.target.value) || null)}>
      {(value == null || allowEmpty) && <option value="">{placeholder}</option>}
      {choices.map((c) => <option key={String(c.value)} value={c.value} disabled={!!c.disabled}>{c.label}{c.disabled ? ` — ${c.disabled}` : ""}</option>)}
    </select>
  );

  /** Celda de un atributo: según la categoría del producto de la fila (— si no lo pide). */
  const attrCell = (i: number, r: Row, attrId: number) => {
    const f = evals[i]?.fields.find((x) => x.attribute.id === attrId);
    if (!f) return <span className="block px-1.5 py-1 text-muted">—</span>;
    const v = r.values[attrId];
    const set = (nv: number | boolean | null) => update(i, { values: { ...r.values, [attrId]: nv } }, `a${attrId}`);
    if (f.kind === "sino") return <input type="checkbox" className="m-2 accent-[#1f6b4f]" checked={v === true} disabled={readOnly} onChange={(e) => set(e.target.checked)} aria-label={`${f.attribute.name} fila ${i + 1}`} />;
    if (f.kind === "numero") return <input className={`${cell} font-mono`} inputMode="decimal" value={typeof v === "number" ? v : ""} disabled={readOnly} onChange={(e) => set(e.target.value === "" ? null : Number(e.target.value.replace(",", ".")) || 0)} aria-label={`${f.attribute.name} fila ${i + 1}`} />;
    return select(i, `a${attrId}`, typeof v === "number" ? v : null, f.choices, set, r.unmatched?.[`a${attrId}`] ?? (f.required ? `${f.attribute.name}…` : "—"), !f.required);
  };

  return (
    <div onPaste={onPaste} data-testid="lines-grid">
      {!readOnly && (
        <div className="flex flex-wrap items-end gap-3 border-b border-line pb-4 text-sm">
          <button type="button" className={btnLine} onClick={() => change((rs) => [...rs, blank()])}>+ Fila</button>
          <button type="button" className={btnLine} onClick={() => dup(1)} disabled={!rows.length}>Duplicar {selected.length > 1 ? `${selected.length} filas` : "fila"}</button>
          <span className="flex items-center gap-2">
            <button type="button" className={btnLine} onClick={() => dup(Number(copies) || 1)} disabled={!rows.length} data-testid="add-copies">Añadir</button>
            <input className="w-12 border-b border-line bg-transparent text-center font-mono" value={copies} onChange={(e) => setCopies(e.target.value.replace(/\D/g, ""))} aria-label="Número de copias" />
            <span className="text-muted">copias</span>
          </span>
          {selected.length > 0 && (
            <button type="button" className="text-muted hover:text-danger" onClick={() => { change((rs) => rs.filter((r) => !sel.has(r.key))); setSel(new Set()); }}>Quitar {selected.length}</button>
          )}
          <span className="ml-auto flex flex-wrap items-center gap-3">
            <a href={`/configurar?proyecto=${data.project.id}`} className={btnLine} data-testid="wizard-link">Agregar con asistente</a>
            <label className={`${btnLine} cursor-pointer`}>
              Importar Excel/CSV
              <input type="file" accept=".csv,.xlsx,.txt" className="sr-only" onChange={onImport} data-testid="grid-import" />
            </label>
            <span className="text-muted">Plantilla: <a className="underline underline-offset-4" href="/api/plantilla-medidas?formato=xlsx">Excel</a> · <a className="underline underline-offset-4" href="/api/plantilla-medidas">CSV</a></span>
          </span>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">
        Puede pegar filas copiadas de Excel (Ctrl + V) con las columnas de la plantilla.
      </p>
      {importMsg && <p className="mt-2 text-sm text-blue" data-testid="grid-message">{importMsg}</p>}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="font-mono text-[11px] text-muted">
            <tr className="border-b border-ink">
              <th className="w-8 py-2" />
              <th className="w-8 py-2 font-normal">#</th>
              {COLS.map((c) => <th key={c.key} className={`py-2 pl-1.5 font-normal ${c.w}`}>{c.label}</th>)}
              <th className="py-2 pr-1 text-right font-normal">{SHOW_PRICES ? "Total" : ""}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const ev = evals[i];
              const err = allErrors[i];
              const td = (col: Col, child: React.ReactNode) => (
                <td key={col} className={`border-l border-line/60 align-top ${err[col] ? "bg-danger/[0.06] outline outline-1 -outline-offset-1 outline-danger/60" : ""}`} title={err[col]}>
                  {child}
                  {err[col] && <span className="block px-1.5 pb-1 text-[11px] leading-tight text-danger" data-testid="cell-error">{err[col]}</span>}
                </td>
              );
              const p = price(i);
              return (
                <tr key={r.key} className={`border-b border-line ${sel.has(r.key) ? "bg-white-stone" : ""}`} data-testid="grid-row">
                  <td className="py-1 align-top"><input type="checkbox" checked={sel.has(r.key)} onChange={() => toggle(r.key)} aria-label={`Seleccionar fila ${i + 1}`} className="mt-2 accent-[#1f6b4f]" /></td>
                  <td className="py-1 pt-2 align-top font-mono text-[11px] text-muted">{i + 1}</td>
                  {td("location", <input className={cell} value={r.location} disabled={readOnly} list="grid-locations" onChange={(e) => update(i, { location: e.target.value }, "location")} aria-label={`Ubicación fila ${i + 1}`} />)}
                  {td("model", <>
                    {select(i, "model", r.modelId, catalog.models.map((m) => ({ value: m.id, label: m.name })), (v) => update(i, { modelId: v }, "model"), r.unmatched?.model ?? "Sin configurar")}
                    {r.modelId && (() => { const v = matchVariant(catalog, { modelId: r.modelId!, values: r.values }); return v ? <span className="block px-1.5 pb-1 font-mono text-[11px] text-muted" data-testid="row-variant">{v.code}</span> : null; })()}
                  </>)}
                  {td("width", <input className={`${cell} font-mono`} inputMode="numeric" value={r.width} disabled={readOnly} onChange={(e) => update(i, { width: e.target.value.replace(/\D/g, "") })} aria-label={`Ancho fila ${i + 1}`} placeholder={ev ? `${ev.limits.minWidth}–${ev.limits.maxWidth}` : ""} />)}
                  {td("height", <input className={`${cell} font-mono`} inputMode="numeric" value={r.height} disabled={readOnly} onChange={(e) => update(i, { height: e.target.value.replace(/\D/g, "") })} aria-label={`Alto fila ${i + 1}`} placeholder={ev ? `${ev.limits.minHeight}–${ev.limits.maxHeight}` : ""} />)}
                  {td("quantity", <input className={`${cell} font-mono`} inputMode="numeric" value={r.quantity} disabled={readOnly} onChange={(e) => update(i, { quantity: e.target.value.replace(/\D/g, "") })} aria-label={`Cantidad fila ${i + 1}`} />)}
                  {attrs.map((a) => td(`a${a.id}`, attrCell(i, r, a.id)))}
                  {td("note", <input className={cell} value={r.note} disabled={readOnly} onChange={(e) => update(i, { note: e.target.value })} aria-label={`Nota fila ${i + 1}`} />)}
                  <td className="py-1 pt-2 pr-1 text-right align-top">
                    {SHOW_PRICES && (p != null ? formatMoney(p) : "—")}
                    {ctx.markOnPlan && ctx.data.plans.length > 0 && r.id && (() => {
                      const placed = ctx.data.lines.find((l) => l.id === r.id)?.x != null;
                      return placed
                        ? <span className="block whitespace-nowrap pt-1 font-mono text-[11px] text-blue">✓ En plano</span>
                        : <button type="button" className="block whitespace-nowrap pt-1 text-[11px] text-muted underline hover:text-ink" onClick={() => ctx.markOnPlan!(r.id!)} data-testid="mark-on-plan">Marcar en plano</button>;
                    })()}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={COLS.length + 3} className="py-6 text-muted">Sin líneas. Agregue una fila, pegue desde Excel o importe la plantilla.</td></tr>}
          </tbody>
        </table>
        <datalist id="grid-locations">{data.locations.map((l) => <option key={l.id} value={locName(l)} />)}</datalist>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-ink pt-4">
        <p className={labelCls}>{rows.length} filas · {windows} ventanas{SHOW_PRICES ? ` · ${formatMoney(total)}` : ""}</p>
        {badRows > 0 && <p className="text-sm text-danger" data-testid="grid-bad-rows">{badRows} {badRows === 1 ? "fila con errores" : "filas con errores"}</p>}
        {!readOnly && (
          <button type="button" className={`${btnPrimary} ml-auto`} disabled={ctx.busy || !dirty} onClick={save} data-testid="grid-save">
            {dirty ? "Guardar tabla" : "Tabla guardada"}
          </button>
        )}
      </div>
    </div>
  );
}
